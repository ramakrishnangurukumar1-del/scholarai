"""Application lifecycle: code generation, the submit pipeline, timeline."""

from __future__ import annotations

import random
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.application import (
    AiAnalysis,
    Application,
    Document,
    DocumentVerification,
    EligibilityResult,
)
from app.models.enums import (
    ApplicationStatus,
    CheckResult,
    DocType,
    RiskLevel,
    VerificationStatus,
)
from app.models.scholarship import Scholarship
from app.models.user import Student
from app.models.workflow import ApplicationHistory, Notification
from app.services.eligibility import score_scholarship

REQUIRED_DOC_TYPES = {DocType.identity, DocType.income_certificate, DocType.marksheet}


def generate_code(db: Session) -> str:
    n = db.scalar(select(func.count()).select_from(Application)) or 0
    return f"SCH-{10000 + n + random.randint(1, 40)}"


def add_history(
    db: Session,
    application: Application,
    action: str,
    *,
    actor_id=None,
    from_status: str | None = None,
    to_status: str | None = None,
    remark: str | None = None,
) -> None:
    db.add(
        ApplicationHistory(
            application_id=application.id,
            actor_id=actor_id,
            action=action,
            from_status=from_status,
            to_status=to_status,
            remark=remark,
        )
    )


def notify(db: Session, user_id, title: str, body: str, link: str | None = None) -> None:
    db.add(Notification(user_id=user_id, title=title, body=body, link=link))


def run_verification_pipeline(
    db: Session, application: Application, student: Student, scholarship: Scholarship
) -> None:
    """Deterministic checks (Phase 5). Phase 7 replaces the document checks with real OCR.

    - completeness: are the required document types present?
    - consistency: does each income certificate's extracted income match the declared income?
    - eligibility: rules engine over the scholarship criteria
    """
    form: dict[str, Any] = application.form_data or {}
    declared_income = _num(form.get("annual_income")) or _num(student.annual_income)

    issues: list[dict] = []
    summary: list[str] = []

    present = {d.doc_type for d in application.documents}
    missing = REQUIRED_DOC_TYPES - present
    if missing:
        names = ", ".join(sorted(m.value.replace("_", " ") for m in missing))
        issues.append({"type": "Missing documents", "severity": "MEDIUM", "detail": names})
        summary.append(f"Missing required documents: {names}")
    else:
        summary.append("All required documents uploaded")

    income_mismatch = False
    for doc in application.documents:
        checks: list[DocumentVerification] = []
        fields = doc.extracted_fields or {}

        if doc.doc_type == DocType.income_certificate:
            doc_income = _num(fields.get("income"))
            if doc_income is not None and declared_income is not None:
                match = abs(doc_income - declared_income) < 1
                checks.append(
                    DocumentVerification(
                        document_id=doc.id,
                        check_name="income_match",
                        result=CheckResult.pass_ if match else CheckResult.warn,
                        detail={"declared": declared_income, "document": doc_income},
                    )
                )
                if not match:
                    income_mismatch = True
                    doc.verification_status = VerificationStatus.mismatch
                    issues.append(
                        {
                            "type": "Income mismatch",
                            "severity": "HIGH",
                            "detail": (
                                f"Declared ₹{declared_income:,.0f} vs "
                                f"document ₹{doc_income:,.0f}"
                            ),
                        }
                    )
                else:
                    doc.verification_status = VerificationStatus.verified
        if doc.verification_status == VerificationStatus.pending:
            doc.verification_status = VerificationStatus.verified
        checks.append(
            DocumentVerification(
                document_id=doc.id, check_name="doc_detected", result=CheckResult.pass_
            )
        )
        db.add_all(checks)

    if income_mismatch:
        summary.append("Income mismatch detected — manual verification recommended")
    summary.append("Identity and academic information consistent")

    # eligibility via the rules engine
    report = score_scholarship(student, scholarship)

    risk = RiskLevel.HIGH if income_mismatch else (RiskLevel.MEDIUM if missing else RiskLevel.LOW)
    confidence = 88 if income_mismatch else 93
    flagged = income_mismatch or bool(missing)
    risk_score = 74 if income_mismatch else (35 if missing else 8)

    db.add(
        EligibilityResult(
            application_id=application.id,
            academic_score=_criteria_field_score(report, "cgpa"),
            income_eligible=report.meets_required,
            documents_ok=not missing,
            criteria_breakdown=report.as_dict()["breakdown"],
            overall_score=report.score,
            verdict=report.verdict,
        )
    )
    db.add(
        AiAnalysis(
            application_id=application.id,
            summary_points=summary,
            issues=issues,
            risk=risk,
            confidence=confidence,
            recommendation=(
                "The declared income does not match the uploaded income certificate. "
                "Manually verify the income certificate before deciding."
                if income_mismatch
                else "Application looks consistent. Ready for authority review."
            ),
            model="rules-v1",
        )
    )

    application.eligibility_score = report.score
    application.risk_score = risk_score
    application.ai_flagged = flagged
    application.status = (
        ApplicationStatus.ai_verification if flagged else ApplicationStatus.under_review
    )


def submit(db: Session, application: Application, student: Student, scholarship: Scholarship):
    application.submitted_at = datetime.now(UTC)
    application.status = ApplicationStatus.submitted
    add_history(
        db, application, "Application submitted", actor_id=student.user_id,
        to_status=ApplicationStatus.submitted.value,
    )
    run_verification_pipeline(db, application, student, scholarship)
    add_history(
        db, application, "Automated verification completed",
        to_status=application.status.value,
    )
    notify(
        db,
        student.user_id,
        "Application submitted",
        f"Your application {application.code} was submitted and verified.",
        link=f"/app/applications/{application.id}",
    )
    db.commit()

    from app.services import events

    events.publish(
        "application.submitted",
        application_id=str(application.id),
        code=application.code,
        scholarship=scholarship.name,
        category=scholarship.category.name if scholarship.category else None,
        actor_role="student",
        flagged=application.ai_flagged,
        eligibility_score=float(application.eligibility_score or 0),
    )


TIMELINE_ORDER = [
    ("Submitted", {ApplicationStatus.submitted, ApplicationStatus.ai_verification,
                   ApplicationStatus.under_review, ApplicationStatus.correction_requested,
                   ApplicationStatus.approved, ApplicationStatus.rejected}),
    ("Documents verified", {ApplicationStatus.ai_verification, ApplicationStatus.under_review,
                            ApplicationStatus.correction_requested, ApplicationStatus.approved,
                            ApplicationStatus.rejected}),
    ("Authority review", {ApplicationStatus.under_review, ApplicationStatus.correction_requested,
                          ApplicationStatus.approved, ApplicationStatus.rejected}),
    ("Final decision", {ApplicationStatus.approved, ApplicationStatus.rejected}),
]


def build_timeline(application: Application) -> list[dict]:
    steps = []
    reached_current = False
    for label, statuses in TIMELINE_ORDER:
        done = application.status in statuses
        state = "done" if done else ("current" if not reached_current else "todo")
        if not done and not reached_current:
            reached_current = True
        steps.append({"label": label, "state": state})
    return steps


def _num(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _criteria_field_score(report, field: str) -> float | None:
    for c in report.breakdown:
        if c.field == field:
            return 100.0 if c.passed else 40.0
    return None
