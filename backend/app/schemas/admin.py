from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Role


class AuthorityCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    department: str | None = None


class UserRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: EmailStr
    role: Role
    is_active: bool
    full_name: str | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    is_active: bool | None = None
    role: Role | None = None
