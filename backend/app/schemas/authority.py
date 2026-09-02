from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DashboardTotals(BaseModel):
    total: int
    pending: int
    flagged: int
    approved: int
    rejected: int


class PipelineStage(BaseModel):
    label: str
    count: int


class DashboardOut(BaseModel):
    totals: DashboardTotals
    pipeline: list[PipelineStage]


class AuthorityAppRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    code: str
    status: str
    ai_flagged: bool
    eligibility_score: float | None = None
    risk_score: float | None = None
    submitted_at: datetime | None = None
    student_name: str | None = None
    scholarship_name: str | None = None


class DecisionIn(BaseModel):
    action: str  # approve | reject | request_correction
    remark: str | None = None


class RemarkIn(BaseModel):
    remark: str


class AssistantIn(BaseModel):
    question: str


class AssistantOut(BaseModel):
    answer: str
    confidence: float | None = None
