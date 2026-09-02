from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import JSON, Boolean, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class ScholarshipCategory(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "scholarship_categories"

    name: Mapped[str] = mapped_column(String(80), unique=True)

    scholarships: Mapped[list[Scholarship]] = relationship(back_populates="category")


class Scholarship(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "scholarships"

    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    category_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scholarship_categories.id"))
    description: Mapped[str | None] = mapped_column(Text)
    amount_max: Mapped[float | None] = mapped_column(Numeric(12, 2))
    provider: Mapped[str | None] = mapped_column(String(200))
    course_filter: Mapped[list[str] | None] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    open_from: Mapped[date | None] = mapped_column(Date)
    close_on: Mapped[date | None] = mapped_column(Date)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))

    category: Mapped[ScholarshipCategory | None] = relationship(back_populates="scholarships")
    criteria: Mapped[list[EligibilityCriteria]] = relationship(
        back_populates="scholarship", cascade="all, delete-orphan"
    )


class EligibilityCriteria(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "eligibility_criteria"

    scholarship_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("scholarships.id", ondelete="CASCADE")
    )
    field: Mapped[str] = mapped_column(String(60))          # cgpa | annual_income | year | course
    operator: Mapped[str] = mapped_column(String(20))       # gte | lte | eq | in | between
    value: Mapped[dict] = mapped_column(JSON)               # 7.5 | 250000 | ["B.Tech"]
    weight: Mapped[float] = mapped_column(Numeric(5, 2), default=1)
    required: Mapped[bool] = mapped_column(Boolean, default=True)

    scholarship: Mapped[Scholarship] = relationship(back_populates="criteria")
