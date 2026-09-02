"""Optional LLM backend (Google Gemini) for the AI Review Assistant.

Enabled only when GOOGLE_API_KEY is set. Everything degrades to the deterministic
responder in `assistant.py` when it's missing or every model call fails.
"""

from __future__ import annotations

import logging
from functools import lru_cache

from app.core.config import settings

log = logging.getLogger("scholarai.llm")

# Tried in order; the first that answers wins. Gemini frequently returns 503/504
# on the newest models under load, so we keep a couple of stable fallbacks.
_FALLBACK_MODELS = ["gemini-3-flash-preview", "gemini-3.5-flash"]


def is_configured() -> bool:
    return bool(settings.GOOGLE_API_KEY)


@lru_cache
def _client():
    from google import genai

    return genai.Client(api_key=settings.GOOGLE_API_KEY, http_options={"timeout": 20_000})


SYSTEM = (
    "You are an assistant helping a scholarship officer review one application. "
    "Answer ONLY from the JSON context provided - never invent facts, amounts, or names. "
    "Be concise: 3-6 short sentences or bullets. "
    "You do not approve or reject anything; end by reminding the officer the decision is theirs."
)


def ask(context_json: str, question: str) -> str | None:
    """Returns the model's answer, or None if the assistant is off / every model failed."""
    if not is_configured():
        return None

    from google.genai import types

    cfg = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        temperature=0.2,
        max_output_tokens=600,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )
    prompt = f"APPLICATION CONTEXT (JSON):\n{context_json}\n\nOFFICER'S QUESTION: {question}"

    models = [settings.AI_MODEL] + [m for m in _FALLBACK_MODELS if m != settings.AI_MODEL]
    for model in models:
        try:
            resp = _client().models.generate_content(model=model, contents=prompt, config=cfg)
            text = (resp.text or "").strip()
            if text:
                return text
        except Exception as exc:  # noqa: BLE001
            log.warning("LLM model %s failed (%s); trying next", model, type(exc).__name__)
    return None
