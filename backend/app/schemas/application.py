from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.models.enums import ApplicationStatus


class ApplicationCreate(BaseModel):
    scholarship_id: uuid.UUID


class ApplicationStepUpdate(BaseModel):
    current_step: int | None = None
    form_data: dict[str, Any] | None = None


class DocVerificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    check_name: str
    result: str
    detail: dict | None = None


class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    doc_type: str
    file_name: str | None = None
    verification_status: str
    extracted_fields: dict | None = None
    checks: list[DocVerificationOut] = []


class EligibilityResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    academic_score: float | None = None
    income_eligible: bool | None = None
    documents_ok: bool | None = None
    overall_score: float | None = None
    verdict: str | None = None
    criteria_breakdown: list | None = None


class AiAnalysisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    summary_points: list | None = None
    issues: list | None = None
    risk: str | None = None
    confidence: float | None = None
    recommendation: str | None = None


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    action: str
    from_status: str | None = None
    to_status: str | None = None
    remark: str | None = None
    created_at: datetime


class ScholarshipMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str


class ApplicationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    status: ApplicationStatus
    current_step: int
    eligibility_score: float | None = None
    risk_score: float | None = None
    ai_flagged: bool
    submitted_at: datetime | None = None
    updated_at: datetime
    scholarship: ScholarshipMini


class TimelineStep(BaseModel):
    label: str
    state: str


class ApplicationDetail(ApplicationListItem):
    form_data: dict | None = None
    student_name: str | None = None
    documents: list[DocumentOut] = []
    eligibility_result: EligibilityResultOut | None = None
    ai_analysis: AiAnalysisOut | None = None
    history: list[HistoryOut] = []
    timeline: list[TimelineStep] = []
