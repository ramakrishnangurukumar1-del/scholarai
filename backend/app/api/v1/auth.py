from __future__ import annotations

import uuid

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.ratelimit import login_rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import Student, User
from app.schemas.auth import (
    AccessTokenOut,
    LoginIn,
    MeOut,
    RefreshIn,
    RegisterIn,
    TokenOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    exists = db.scalar(select(User).where(User.email == payload.email.lower()))
    if exists:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Self-registration always creates a student. Authorities/admins are created by an admin.
    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=Role.student,
    )
    db.add(user)
    db.flush()
    db.add(
        Student(
            user_id=user.id,
            full_name=payload.full_name,
            college=payload.college,
            profile_complete=False,
        )
    )
    db.commit()

    return TokenOut(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id, user.role.value),
    )


@router.post("/login", response_model=TokenOut, dependencies=[Depends(login_rate_limit)])
def login(payload: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    return TokenOut(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id, user.role.value),
    )


@router.post("/refresh", response_model=AccessTokenOut)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> AccessTokenOut:
    try:
        data = decode_token(payload.refresh_token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from None
    if data.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Not a refresh token")

    user = db.get(User, uuid.UUID(data["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    return AccessTokenOut(access_token=create_access_token(user.id, user.role.value))


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> MeOut:
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    return MeOut(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        full_name=student.full_name if student else None,
        profile=student,
    )
