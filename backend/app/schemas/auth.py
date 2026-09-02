from __future__ import annotations

import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Role


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    college: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StudentProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    full_name: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    college: str | None = None
    course: str | None = None
    year: int | None = None
    cgpa: float | None = None
    annual_income: float | None = None
    family_members: int | None = None
    income_source: str | None = None
    profile_complete: bool = False


class MeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    role: Role
    is_active: bool
    full_name: str | None = None
    profile: StudentProfileOut | None = None
