import enum


class Role(str, enum.Enum):
    student = "student"
    authority = "authority"
    admin = "admin"


class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    submitted = "submitted"
    ai_verification = "ai_verification"
    under_review = "under_review"
    correction_requested = "correction_requested"
    approved = "approved"
    rejected = "rejected"


class DocType(str, enum.Enum):
    identity = "identity"
    income_certificate = "income_certificate"
    marksheet = "marksheet"
    bank = "bank"
    other = "other"


class VerificationStatus(str, enum.Enum):
    pending = "pending"
    scanned = "scanned"
    verified = "verified"
    mismatch = "mismatch"
    failed = "failed"


class CheckResult(str, enum.Enum):
    pass_ = "pass"
    warn = "warn"
    fail = "fail"


class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
