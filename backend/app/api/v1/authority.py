from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import require_role
from app.db.session import get_db
from app.models.application import Application
from app.models.enums import ApplicationStatus, Role
from app.models.scholarship import Scholarship
from app.models.user import Student, User
from app.schemas.authority import (
    AssistantIn,
    AssistantOut,
    AuthorityAppRow,
    DashboardOut,
    DashboardTotals,
    DecisionIn,
    PipelineStage,
    RemarkIn,
)
from app.services import applications as appsvc
from app.services.assistant import answer_question

router = APIRouter(prefix="/authority", tags=["authority"])
guard = Depends(require_role(Role.authority, Role.admin))

_DECISION = {
    "approve": (ApplicationStatus.approved, "approved", "Your application was approved."),
    "reject": (ApplicationStatus.rejected, "rejected", "Your application was rejected."),
    "request_correction": (
        ApplicationStatus.correction_requested,
        "correction requested",
        "A correction was requested on your application.",
    ),
}


@router.get("/dashboard", response_model=DashboardOut, dependencies=[guard])
def dashboard(db: Session = Depends(get_db)) -> DashboardOut:
    def count(*where) -> int:
        return db.scalar(select(func.count()).select_from(Application).where(*where)) or 0

    non_draft = Application.status != ApplicationStatus.draft
    totals = DashboardTotals(
        total=count(non_draft),
        pending=count(
            Application.status.in_(
                [ApplicationStatus.submitted, ApplicationStatus.ai_verification,
                 ApplicationStatus.under_review]
            )
        ),
        flagged=count(Application.ai_flagged.is_(True), non_draft),
        approved=count(Application.status == ApplicationStatus.approved),
        rejected=count(Application.status == ApplicationStatus.rejected),
    )
    pipeline = [
        PipelineStage(label="Submitted", count=count(Application.status == ApplicationStatus.submitted)),
        PipelineStage(
            label="Verification",
            count=count(Application.status == ApplicationStatus.ai_verification),
        ),
        PipelineStage(
            label="Review", count=count(Application.status == ApplicationStatus.under_review)
        ),
        PipelineStage(
            label="Approved", count=count(Application.status == ApplicationStatus.approved)
        ),
    ]
    return DashboardOut(totals=totals, pipeline=pipeline)


@router.get("/applications", response_model=list[AuthorityAppRow], dependencies=[guard])
def list_applications(
    db: Session = Depends(get_db),
    status: str = Query(default="All"),
    ai_status: str = Query(default="All", description="All | Flagged | Clean"),
    q: str | None = Query(default=None),
) -> list[AuthorityAppRow]:
    stmt = (
        select(Application, Student.full_name, Scholarship.name)
        .join(Student, Student.id == Application.student_id)
        .join(Scholarship, Scholarship.id == Application.scholarship_id)
        .where(Application.status != ApplicationStatus.draft)
        .order_by(Application.updated_at.desc())
    )
    if status != "All":
        stmt = stmt.where(Application.status == ApplicationStatus(status))
    if ai_status == "Flagged":
        stmt = stmt.where(Application.ai_flagged.is_(True))
    elif ai_status == "Clean":
        stmt = stmt.where(Application.ai_flagged.is_(False))
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Application.code.ilike(like) | Student.full_name.ilike(like))

    rows = db.execute(stmt).all()
    out = []
    for app, student_name, sch_name in rows:
        out.append(
            AuthorityAppRow(
                id=app.id,
                code=app.code,
                status=app.status.value,
                ai_flagged=app.ai_flagged,
                eligibility_score=float(app.eligibility_score) if app.eligibility_score else None,
                risk_score=float(app.risk_score) if app.risk_score else None,
                submitted_at=app.submitted_at,
                student_name=student_name,
                scholarship_name=sch_name,
            )
        )
    return out


def _load(db: Session, application_id: uuid.UUID) -> Application:
    app = db.scalars(
        select(Application)
        .options(selectinload(Application.ai_analysis), selectinload(Application.history))
        .where(Application.id == application_id)
    ).first()
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


@router.post("/applications/{application_id}/decision", dependencies=[guard])
def decide(
    application_id: uuid.UUID,
    payload: DecisionIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.authority, Role.admin)),
) -> dict:
    if payload.action not in _DECISION:
        raise HTTPException(status_code=400, detail="Invalid action")
    app = _load(db, application_id)
    if app.status in (ApplicationStatus.approved, ApplicationStatus.rejected):
        raise HTTPException(status_code=409, detail="Application already decided")

    new_status, verb, student_msg = _DECISION[payload.action]
    prev = app.status.value
    app.status = new_status
    if new_status in (ApplicationStatus.approved, ApplicationStatus.rejected):
        app.decided_at = datetime.now(UTC)
        app.decided_by = user.id

    appsvc.add_history(
        db, app, f"Application {verb}", actor_id=user.id,
        from_status=prev, to_status=new_status.value, remark=payload.remark,
    )
    student = db.get(Student, app.student_id)
    if student:
        appsvc.notify(
            db, student.user_id, f"Application {verb}",
            f"{student_msg}" + (f" Remark: {payload.remark}" if payload.remark else ""),
            link=f"/app/applications/{app.id}",
        )
    db.commit()

    from app.services import events

    events.publish(
        f"application.{payload.action}",
        application_id=str(app.id),
        code=app.code,
        scholarship=app.scholarship.name if app.scholarship else None,
        category=app.scholarship.category.name
        if app.scholarship and app.scholarship.category
        else None,
        actor_role=user.role.value,
        from_status=prev,
        to_status=new_status.value,
    )
    return {"ok": True, "status": new_status.value}


@router.post("/applications/{application_id}/remark", dependencies=[guard])
def add_remark(
    application_id: uuid.UUID,
    payload: RemarkIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(Role.authority, Role.admin)),
) -> dict:
    app = _load(db, application_id)
    appsvc.add_history(db, app, "Remark added", actor_id=user.id, remark=payload.remark)
    db.commit()
    return {"ok": True}


@router.post(
    "/applications/{application_id}/assistant", response_model=AssistantOut, dependencies=[guard]
)
def assistant(
    application_id: uuid.UUID, payload: AssistantIn, db: Session = Depends(get_db)
) -> AssistantOut:
    app = db.scalars(
        select(Application)
        .options(selectinload(Application.ai_analysis), selectinload(Application.scholarship))
        .where(Application.id == application_id)
    ).first()
    if app is None:
        raise HTTPException(status_code=404, detail="Application not found")
    answer, confidence = answer_question(app, payload.question)
    return AssistantOut(answer=answer, confidence=confidence)
