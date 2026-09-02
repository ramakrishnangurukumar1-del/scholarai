from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.core.security import hash_password
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import Authority, Student, User
from app.schemas.admin import AuthorityCreate, UserRow, UserUpdate

router = APIRouter(prefix="/admin", tags=["admin"])
guard = Depends(require_role(Role.admin))


def _name_for(db: Session, user: User) -> str | None:
    if user.role == Role.student:
        s = db.scalar(select(Student).where(Student.user_id == user.id))
        return s.full_name if s else None
    if user.role == Role.authority:
        a = db.scalar(select(Authority).where(Authority.user_id == user.id))
        return a.full_name if a else None
    return None


@router.get("/users", response_model=list[UserRow], dependencies=[guard])
def list_users(role: str | None = None, db: Session = Depends(get_db)) -> list[UserRow]:
    stmt = select(User).order_by(User.created_at)
    if role:
        stmt = stmt.where(User.role == Role(role))
    return [
        UserRow(
            id=u.id,
            email=u.email,
            role=u.role,
            is_active=u.is_active,
            full_name=_name_for(db, u),
            created_at=u.created_at,
        )
        for u in db.scalars(stmt)
    ]


@router.post("/authorities", response_model=UserRow, status_code=201, dependencies=[guard])
def create_authority(payload: AuthorityCreate, db: Session = Depends(get_db)) -> UserRow:
    if db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=Role.authority,
    )
    db.add(user)
    db.flush()
    db.add(
        Authority(user_id=user.id, full_name=payload.full_name, department=payload.department)
    )
    db.commit()
    db.refresh(user)
    return UserRow(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        full_name=payload.full_name,
        created_at=user.created_at,
    )


@router.patch("/users/{user_id}", response_model=UserRow, dependencies=[guard])
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
) -> UserRow:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == me.id:
        raise HTTPException(status_code=400, detail="You cannot change your own account")

    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None and payload.role != user.role:
        user.role = payload.role
        # keep the role-specific profile row in sync
        if payload.role == Role.authority and not db.scalar(
            select(Authority).where(Authority.user_id == user.id)
        ):
            db.add(Authority(user_id=user.id, full_name=None, department=None))
    db.commit()
    db.refresh(user)
    return UserRow(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        full_name=_name_for(db, user),
        created_at=user.created_at,
    )
