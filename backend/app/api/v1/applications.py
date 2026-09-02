from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.application import Application, Document
from app.models.enums import ApplicationStatus, DocType, Role
from app.models.scholarship import Scholarship
from app.models.user import Student, User
from app.schemas.application import (
    ApplicationCreate,
    ApplicationDetail,
    ApplicationListItem,
    ApplicationStepUpdate,
    DocumentOut,
    TimelineStep,
)
from app.services import applications as svc
from app.services import ocr

router = APIRouter(tags=["applications"])
STORAGE = Path(settings.STORAGE_DIR)


def _student(db: Session, user: User) -> Student:
    s = db.scalar(select(Student).where(Student.user_id == user.id))
    if s is None:
        raise HTTPException(status_code=403, detail="Not a student account")
    return s


def _load(db: Session, application_id: uuid.UUID) -> Application:
    app = db.scalars(
        select(Application)
        .options(
            selectinload(Application.scholarship),
            selectinload(Application.documents).selectinload(Document.checks),
            selectinload(Application.eligibility_result),
            selectinload(Application.ai_analysis),
            selectinload(Application.history),
        )
        .where(Application.id == application_id)
    ).first()
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _detail(db: Session, app: Application) -> ApplicationDetail:
    student = db.get(Student, app.student_id)
    return ApplicationDetail(
        id=app.id,
        code=app.code,
        status=app.status,
        current_step=app.current_step,
        eligibility_score=float(app.eligibility_score) if app.eligibility_score is not None else None,
        risk_score=float(app.risk_score) if app.risk_score is not None else None,
        ai_flagged=app.ai_flagged,
        submitted_at=app.submitted_at,
        updated_at=app.updated_at,
        scholarship=app.scholarship,
        form_data=app.form_data,
        student_name=student.full_name if student else None,
        documents=[DocumentOut.model_validate(d) for d in app.documents],
        eligibility_result=app.eligibility_result,
        ai_analysis=app.ai_analysis,
        history=sorted(app.history, key=lambda h: h.created_at),
        timeline=[TimelineStep(**s) for s in svc.build_timeline(app)],
    )


# ---------- student ----------
@router.get("/students/me/applications", response_model=list[ApplicationListItem])
def my_applications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    student = _student(db, user)
    rows = db.scalars(
        select(Application)
        .options(selectinload(Application.scholarship))
        .where(Application.student_id == student.id)
        .order_by(Application.updated_at.desc())
    ).all()
    return rows


@router.post("/applications", response_model=ApplicationDetail, status_code=201)
def create_application(
    payload: ApplicationCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    student = _student(db, user)
    scholarship = db.get(Scholarship, payload.scholarship_id)
    if scholarship is None:
        raise HTTPException(status_code=404, detail="Scholarship not found")

    existing = db.scalar(
        select(Application).where(
            Application.student_id == student.id,
            Application.scholarship_id == scholarship.id,
            Application.status == ApplicationStatus.draft,
        )
    )
    if existing:
        return _detail(db, _load(db, existing.id))

    app = Application(
        code=svc.generate_code(db),
        student_id=student.id,
        scholarship_id=scholarship.id,
        status=ApplicationStatus.draft,
        current_step=1,
        form_data={},
    )
    db.add(app)
    db.commit()
    return _detail(db, _load(db, app.id))


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    app = _load(db, application_id)
    _authorise(db, app, user)
    return _detail(db, app)


@router.put("/applications/{application_id}", response_model=ApplicationDetail)
def save_step(
    application_id: uuid.UUID,
    payload: ApplicationStepUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _load(db, application_id)
    _require_owner(db, app, user)
    if app.status != ApplicationStatus.draft:
        raise HTTPException(status_code=409, detail="Application already submitted")
    if payload.current_step is not None:
        app.current_step = payload.current_step
    if payload.form_data is not None:
        app.form_data = {**(app.form_data or {}), **payload.form_data}
    db.commit()
    return _detail(db, _load(db, app.id))


@router.post("/applications/{application_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    application_id: uuid.UUID,
    doc_type: DocType = Form(...),
    extracted_income: float | None = Form(default=None),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _load(db, application_id)
    _require_owner(db, app, user)

    if file.content_type and file.content_type not in settings.allowed_upload_types:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type. Allowed: {', '.join(sorted(settings.allowed_upload_types))}",
        )
    data = await file.read()
    if len(data) > settings.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.MAX_UPLOAD_MB} MB")

    dest_dir = STORAGE / str(app.id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{doc_type.value}-{uuid.uuid4().hex[:8]}-{file.filename or 'upload'}"
    (dest_dir / safe_name).write_bytes(data)

    # Real OCR (Tesseract). Falls back to the manual `extracted_income` field, then to
    # the declared income, when OCR is unavailable or finds nothing.
    form = app.form_data or {}
    declared = form.get("annual_income")
    ocr_text = ocr.extract_text(data, file.content_type)
    parsed = ocr.parse_fields(ocr_text, doc_type.value)

    extracted: dict = {"name": parsed.get("name") or form.get("full_name") or ""}
    for k in ("cert_no", "date"):
        if parsed.get(k):
            extracted[k] = parsed[k]
    if doc_type == DocType.income_certificate:
        extracted["income"] = (
            parsed.get("income")
            if parsed.get("income") is not None
            else (extracted_income if extracted_income is not None else declared)
        )
        extracted["income_source"] = "ocr" if parsed.get("income") is not None else "manual"

    # replace an existing doc of the same type
    for old in list(app.documents):
        if old.doc_type == doc_type:
            db.delete(old)

    doc = Document(
        application_id=app.id,
        doc_type=doc_type,
        file_path=str(dest_dir / safe_name),
        file_name=file.filename,
        mime_type=file.content_type,
        size_bytes=len(data),
        ocr_text=ocr_text or None,
        extracted_fields=extracted,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return DocumentOut.model_validate(doc)


@router.delete("/documents/{document_id}", status_code=204)
def delete_document(
    document_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    app = _load(db, doc.application_id)
    _require_owner(db, app, user)
    db.delete(doc)
    db.commit()


@router.post("/applications/{application_id}/submit", response_model=ApplicationDetail)
def submit_application(
    application_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    app = _load(db, application_id)
    student = _require_owner(db, app, user)
    if app.status != ApplicationStatus.draft:
        raise HTTPException(status_code=409, detail="Already submitted")
    if not app.documents:
        raise HTTPException(status_code=400, detail="Upload your documents before submitting")

    svc.submit(db, app, student, app.scholarship)
    return _detail(db, _load(db, app.id))


@router.get("/applications/{application_id}/timeline", response_model=list[TimelineStep])
def timeline(
    application_id: uuid.UUID, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    app = _load(db, application_id)
    _authorise(db, app, user)
    return [TimelineStep(**s) for s in svc.build_timeline(app)]


# ---------- auth helpers ----------
def _require_owner(db: Session, app: Application, user: User) -> Student:
    student = _student(db, user)
    if app.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not your application")
    return student


def _authorise(db: Session, app: Application, user: User) -> None:
    if user.role in (Role.authority, Role.admin):
        return
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if student is None or app.student_id != student.id:
        raise HTTPException(status_code=403, detail="Not authorised")
