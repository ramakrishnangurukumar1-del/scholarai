"""Rules-based eligibility scoring.

Deterministic — evaluates a student's profile against a scholarship's
`eligibility_criteria` rows. This is the engine behind the eligibility-check
and recommendation endpoints (and AI feature #3 later).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.models.scholarship import Scholarship
from app.models.user import Student

# which student attribute each criterion `field` maps to
_FIELD_MAP = {
    "cgpa": "cgpa",
    "annual_income": "annual_income",
    "year": "year",
    "course": "course",
    "attendance": None,  # not stored on Student yet
}


@dataclass
class CriterionResult:
    field: str
    operator: str
    expected: Any
    actual: Any
    passed: bool
    required: bool
    weight: float


@dataclass
class EligibilityReport:
    scholarship_id: str
    score: float                       # 0-100
    verdict: str                       # likely_eligible | borderline | unlikely
    meets_required: bool
    breakdown: list[CriterionResult] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "scholarship_id": self.scholarship_id,
            "score": round(self.score, 1),
            "verdict": self.verdict,
            "meets_required": self.meets_required,
            "breakdown": [
                {
                    "field": c.field,
                    "operator": c.operator,
                    "expected": c.expected,
                    "actual": c.actual,
                    "passed": c.passed,
                    "required": c.required,
                }
                for c in self.breakdown
            ],
        }


def _to_number(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _evaluate(operator: str, actual: Any, expected: Any) -> bool:
    if actual is None:
        return False
    a_num, e_num = _to_number(actual), _to_number(expected)
    match operator:
        case "gte":
            return a_num is not None and e_num is not None and a_num >= e_num
        case "lte":
            return a_num is not None and e_num is not None and a_num <= e_num
        case "eq":
            if a_num is not None and e_num is not None:
                return a_num == e_num
            return str(actual).strip().lower() == str(expected).strip().lower()
        case "in":
            opts = expected if isinstance(expected, list) else [expected]
            return str(actual).strip().lower() in {str(o).strip().lower() for o in opts}
        case "between":
            if isinstance(expected, list) and len(expected) == 2 and a_num is not None:
                lo, hi = _to_number(expected[0]), _to_number(expected[1])
                return lo is not None and hi is not None and lo <= a_num <= hi
            return False
        case _:
            return False


def score_scholarship(student: Student, scholarship: Scholarship) -> EligibilityReport:
    results: list[CriterionResult] = []
    total_weight = 0.0
    earned_weight = 0.0
    meets_required = True

    for crit in scholarship.criteria:
        attr = _FIELD_MAP.get(crit.field, crit.field)
        actual = getattr(student, attr, None) if attr else None
        # Numeric-ish values arrive from the DB as Decimal; normalise for comparison.
        if actual is not None and hasattr(actual, "__float__") and crit.field != "course":
            actual = float(actual)
        passed = _evaluate(crit.operator, actual, crit.value)
        w = float(crit.weight or 1)
        total_weight += w
        if passed:
            earned_weight += w
        elif crit.required:
            meets_required = False
        results.append(
            CriterionResult(
                field=crit.field,
                operator=crit.operator,
                expected=crit.value,
                actual=actual,
                passed=passed,
                required=bool(crit.required),
                weight=w,
            )
        )

    score = (earned_weight / total_weight * 100) if total_weight else 100.0
    if not meets_required:
        score = min(score, 45.0)

    if score >= 80 and meets_required:
        verdict = "likely_eligible"
    elif score >= 50:
        verdict = "borderline"
    else:
        verdict = "unlikely"

    return EligibilityReport(
        scholarship_id=str(scholarship.id),
        score=score,
        verdict=verdict,
        meets_required=meets_required,
        breakdown=results,
    )
