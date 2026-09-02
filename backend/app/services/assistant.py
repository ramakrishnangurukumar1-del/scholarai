"""AI Review Assistant (AI feature #6).

Phase 6 ships a deterministic, grounded responder — it only uses fields already on
the application (ai_analysis, form_data, documents). Phase 7 can swap the body of
`answer_question` for an LLM call with the same grounding context, no API changes.
"""

from __future__ import annotations

import json

from app.models.application import Application
from app.services import llm


def _context(app: Application) -> dict:
    analysis = app.ai_analysis
    return {
        "code": app.code,
        "status": app.status.value,
        "flagged": app.ai_flagged,
        "eligibility_score": float(app.eligibility_score) if app.eligibility_score else None,
        "risk": analysis.risk.value if analysis and analysis.risk else None,
        "confidence": float(analysis.confidence) if analysis and analysis.confidence else None,
        "issues": (analysis.issues if analysis else []) or [],
        "summary": (analysis.summary_points if analysis else []) or [],
        "recommendation": analysis.recommendation if analysis else None,
    }


def answer_question(app: Application, question: str) -> tuple[str, float | None]:
    ctx = _context(app)

    # Try the real LLM first (only runs if GOOGLE_API_KEY is configured).
    llm_answer = llm.ask(
        json.dumps({"scholarship": app.scholarship.name, **ctx}, default=str), question
    )
    if llm_answer:
        return llm_answer, ctx["confidence"]

    # Deterministic grounded fallback.
    q = question.lower()

    if not ctx["summary"] and not ctx["issues"]:
        return (
            f"Application {ctx['code']} has not been through automated verification yet.",
            None,
        )

    wants_reason = any(w in q for w in ("why", "flag", "risk", "wrong", "issue", "problem"))

    lines: list[str] = [f"Application {ctx['code']} — {app.scholarship.name}", ""]

    if ctx["flagged"] and wants_reason:
        lines.append("It was flagged for the following:")
        for iss in ctx["issues"]:
            lines.append(f"  • {iss.get('type')} ({iss.get('severity')}): {iss.get('detail')}")
        lines.append("")
        lines.append("Checks that passed:")
        for s in ctx["summary"]:
            if "mismatch" not in s.lower() and "missing" not in s.lower():
                lines.append(f"  • {s}")
        lines.append("")
        lines.append(f"Recommendation: {ctx['recommendation']}")
    else:
        lines.append("Automated check summary:")
        for s in ctx["summary"]:
            lines.append(f"  • {s}")
        lines.append("")
        lines.append(
            f"Eligibility score: {ctx['eligibility_score']:.0f}%. "
            f"Risk: {ctx['risk']}."
        )
        if ctx["recommendation"]:
            lines.append(f"Recommendation: {ctx['recommendation']}")

    lines.append("")
    lines.append("The final decision is yours — this is advisory only.")
    return "\n".join(lines), ctx["confidence"]
