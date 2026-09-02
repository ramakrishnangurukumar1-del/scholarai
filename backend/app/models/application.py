from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from typing import TYPE_CHECKING

from app.db.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import ApplicationStatus, CheckResult, DocType, RiskLevel, VerificationStatus

if TYPE_CHECKING:
    from app.models.scholarship import Scholarship
    from app.models.user import Student
    from app.models.workflow import ApplicationHistory


class Application(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "applications"

    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    student_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("students.id"))
    scholarship_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scholarships.id"))
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus, name="application_status"), default=ApplicationStatus.draft
    )
    current_step: Mapped[int] = mapped_column(Integer, default=1)
    form_data: Mapped[dict | None] = mapped_column(JSON)
    eligibility_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    risk_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    ai_flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    submitted_at: Mapped[datetime | None]
    decided_at: Mapped[datetime | None]
    decided_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))

    scholarship: Mapped[Scholarship] = relationship(lazy="selectin")
    student: Mapped[Student] = relationship()
    documents: Mapped[list[Document]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    history: Mapped[list[ApplicationHistory]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    eligibility_result: Mapped[EligibilityResult | None] = relationship(
        back_populates="application", uselist=False, cascade="all, delete-orphan"
    )
    ai_analysis: Mapped[AiAnalysis | None] = relationship(
        back_populates="application", uselist=False, cascade="all, delete-orphan"
    )


class Document(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "documents"

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE")
    )
    doc_type: Mapped[DocType] = mapped_column(SAEnum(DocType, name="doc_type"))
    file_path: Mapped[str] = mapped_column(String(500))
    file_name: Mapped[str | None] = mapped_column(String(255))
    mime_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    verification_status: Mapped[VerificationStatus] = mapped_column(
        SAEnum(VerificationStatus, name="verification_status"), default=VerificationStatus.pending
    )
    ocr_text: Mapped[str | None] = mapped_column(Text)
    extracted_fields: Mapped[dict | None] = mapped_column(JSON)

    application: Mapped[Application] = relationship(back_populates="documents")
    checks: Mapped[list[DocumentVerification]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class DocumentVerification(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "document_verifications"

    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE")
    )
    check_name: Mapped[str] = mapped_column(String(60))     # name_match | income_match | ...
    result: Mapped[CheckResult] = mapped_column(SAEnum(CheckResult, name="check_result"))
    detail: Mapped[dict | None] = mapped_column(JSON)

    document: Mapped[Document] = relationship(back_populates="checks")


class EligibilityResult(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "eligibility_results"

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), unique=True
    )
    academic_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    income_eligible: Mapped[bool | None] = mapped_column(Boolean)
    documents_ok: Mapped[bool | None] = mapped_column(Boolean)
    criteria_breakdown: Mapped[dict | None] = mapped_column(JSON)
    overall_score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    verdict: Mapped[str | None] = mapped_column(String(30))  # likely_eligible | borderline | unlikely

    application: Mapped[Application] = relationship(back_populates="eligibility_result")


class AiAnalysis(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ai_analysis"

    application_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE"), unique=True
    )
    summary_points: Mapped[list | None] = mapped_column(JSON)
    issues: Mapped[list | None] = mapped_column(JSON)
    risk: Mapped[RiskLevel | None] = mapped_column(SAEnum(RiskLevel, name="risk_level"))
    confidence: Mapped[float | None] = mapped_column(Numeric(5, 2))
    recommendation: Mapped[str | None] = mapped_column(Text)
    model: Mapped[str | None] = mapped_column(String(80))

    application: Mapped[Application] = relationship(back_populates="ai_analysis")
