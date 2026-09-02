from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict


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


class StudentProfileUpdate(BaseModel):
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


class RecommendationOut(BaseModel):
    id: str
    name: str
    slug: str
    category: str | None = None
    amount_max: float | None = None
    match: float          # 0-100
    verdict: str
