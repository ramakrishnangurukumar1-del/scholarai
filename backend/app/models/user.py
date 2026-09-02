from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import Boolean, Date, ForeignKey, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import Role


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role, name="role"), default=Role.student)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    student: Mapped[Student | None] = relationship(back_populates="user", uselist=False)
    authority: Mapped[Authority | None] = relationship(back_populates="user", uselist=False)


class Student(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "students"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    full_name: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(30))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    college: Mapped[str | None] = mapped_column(String(200))
    course: Mapped[str | None] = mapped_column(String(120))
    year: Mapped[int | None]
    cgpa: Mapped[float | None] = mapped_column(Numeric(4, 2))
    annual_income: Mapped[float | None] = mapped_column(Numeric(12, 2))
    family_members: Mapped[int | None]
    income_source: Mapped[str | None] = mapped_column(String(120))
    profile_complete: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship(back_populates="student")


class Authority(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "authorities"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), unique=True)
    full_name: Mapped[str | None] = mapped_column(String(200))
    department: Mapped[str | None] = mapped_column(String(120))

    user: Mapped[User] = relationship(back_populates="authority")
