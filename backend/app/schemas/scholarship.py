from __future__ import annotations

import uuid
from datetime import date
from typing import Any

from pydantic import BaseModel, ConfigDict


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str


class CategoryCreate(BaseModel):
    name: str


class CriteriaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    field: str
    operator: str
    value: Any
    weight: float
    required: bool


class CriteriaCreate(BaseModel):
    field: str            # cgpa | annual_income | year | course | attendance
    operator: str         # gte | lte | eq | in | between
    value: Any
    weight: float = 1
    required: bool = True


class ScholarshipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    amount_max: float | None = None
    provider: str | None = None
    course_filter: list[str] | None = None
    is_active: bool
    open_from: date | None = None
    close_on: date | None = None
    category: CategoryOut | None = None


class ScholarshipDetailOut(ScholarshipOut):
    criteria: list[CriteriaOut] = []


class ScholarshipCreate(BaseModel):
    name: str
    slug: str
    category_id: uuid.UUID | None = None
    description: str | None = None
    amount_max: float | None = None
    provider: str | None = None
    course_filter: list[str] | None = None
    open_from: date | None = None
    close_on: date | None = None


class ScholarshipUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    category_id: uuid.UUID | None = None
    description: str | None = None
    amount_max: float | None = None
    provider: str | None = None
    course_filter: list[str] | None = None
    is_active: bool | None = None
    open_from: date | None = None
    close_on: date | None = None


class EligibilityCheckOut(BaseModel):
    scholarship_id: str
    score: float
    verdict: str
    meets_required: bool
    breakdown: list[dict]
