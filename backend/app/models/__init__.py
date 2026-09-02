"""Import every model so Alembic autogenerate and mappers see them."""

from app.db.base import Base
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
    Role,
    VerificationStatus,
)
from app.models.scholarship import EligibilityCriteria, Scholarship, ScholarshipCategory
from app.models.user import Authority, Student, User
from app.models.workflow import ApplicationHistory, AuditLog, Notification

__all__ = [
    "Base",
    "AiAnalysis",
    "Application",
    "ApplicationHistory",
    "ApplicationStatus",
    "Authority",
    "AuditLog",
    "CheckResult",
    "Document",
    "DocumentVerification",
    "DocType",
    "EligibilityCriteria",
    "EligibilityResult",
    "Notification",
    "RiskLevel",
    "Role",
    "Scholarship",
    "ScholarshipCategory",
    "Student",
    "User",
    "VerificationStatus",
]
