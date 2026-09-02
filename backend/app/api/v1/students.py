from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.enums import Role
from app.models.scholarship import Scholarship
from app.models.user import Student, User
from app.models.workflow import Notification
from app.schemas.student import (
    RecommendationOut,
    StudentProfileOut,
    StudentProfileUpdate,
)
from app.services.eligibility import score_scholarship

router = APIRouter(prefix="/students/me", tags=["students"])

_REQUIRED_FIELDS = ("full_name", "phone", "college", "course", "year", "cgpa", "annual_income")


def _get_student(db: Session, user: User) -> Student:
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if student is None:
        # every student user gets a row at registration, but be defensive
        student = Student(user_id=user.id)
        db.add(student)
        db.commit()
        db.refresh(student)
    return student


@router.get("/profile", response_model=StudentProfileOut)
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Student:
    return _get_student(db, user)


@router.put("/profile", response_model=StudentProfileOut)
def update_profile(
    payload: StudentProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Student:
    student = _get_student(db, user)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(student, k, v)
    student.profile_complete = all(getattr(student, f) not in (None, "") for f in _REQUIRED_FIELDS)
    db.commit()
    db.refresh(student)
    return student


@router.get("/recommendations", response_model=list[RecommendationOut])
def recommendations(
    limit: int = 5,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RecommendationOut]:
    if user.role != Role.student:
        return []
    student = _get_student(db, user)
    scholarships = db.scalars(
        select(Scholarship)
        .options(selectinload(Scholarship.criteria), selectinload(Scholarship.category))
        .where(Scholarship.is_active.is_(True))
    ).all()

    scored = []
    for s in scholarships:
        report = score_scholarship(student, s)
        scored.append(
            RecommendationOut(
                id=str(s.id),
                name=s.name,
                slug=s.slug,
                category=s.category.name if s.category else None,
                amount_max=float(s.amount_max) if s.amount_max is not None else None,
                match=round(report.score, 1),
                verdict=report.verdict,
            )
        )
    scored.sort(key=lambda r: r.match, reverse=True)
    return scored[:limit]


@router.get("/notifications")
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .limit(20)
    ).all()
    return [
        {
            "id": str(n.id),
            "title": n.title,
            "body": n.body,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in rows
    ]


@router.post("/notifications/{notification_id}/read", status_code=204)
def mark_read(
    notification_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> None:
    n = db.get(Notification, notification_id)
    if n and n.user_id == user.id:
        n.is_read = True
        db.commit()
