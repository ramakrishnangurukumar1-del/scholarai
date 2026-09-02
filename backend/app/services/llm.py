"""Optional LLM backend (Google Gemini) for the AI Review Assistant.

Enabled only when GOOGLE_API_KEY is set. Everything degrades to the deterministic
responder in `assistant.py` when it's missing or the call fails.
"""

from __future__ import annotations

from functools import lru_cache

from app.core.config import settings


def is_configured() -> bool:
    return bool(settings.GOOGLE_API_KEY)


@lru_cache
def _client():
    from google import genai

    return genai.Client(api_key=settings.GOOGLE_API_KEY)


SYSTEM = (
    "You are an assistant helping a scholarship officer review one application. "
    "Answer ONLY from the JSON context provided — never invent facts, amounts, or names. "
    "Be concise (a few short sentences or bullets). "
    "You do not approve or reject anything; end by reminding the officer the decision is theirs."
)


def ask(context_json: str, question: str) -> str | None:
    """Returns the model's answer, or None on any failure (caller falls back)."""
    if not is_configured():
        return None
    try:
        resp = _client().models.generate_content(
            model=settings.AI_MODEL,
            contents=(
                f"{SYSTEM}\n\nAPPLICATION CONTEXT (JSON):\n{context_json}\n\n"
                f"OFFICER'S QUESTION: {question}"
            ),
        )
        text = (resp.text or "").strip()
        return text or None
    except Exception:
        return None
