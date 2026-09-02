"""Real OCR for uploaded documents (AI feature #1).

Uses Tesseract via pytesseract for images, and pypdf for text-layer PDFs.
Degrades gracefully: if Tesseract isn't installed, `available()` is False and the
upload endpoint falls back to the manual `extracted_income` field.
"""

from __future__ import annotations

import io
import os
import re
from functools import lru_cache
from pathlib import Path

from app.core.config import settings

_COMMON_WINDOWS_PATHS = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
]


@lru_cache
def _configure() -> bool:
    """Point pytesseract at the binary. Returns True if a working tesseract is found."""
    try:
        import pytesseract
    except ImportError:
        return False

    candidates = [settings.TESSERACT_CMD] if settings.TESSERACT_CMD else []
    candidates += _COMMON_WINDOWS_PATHS
    for c in candidates:
        if c and Path(c).exists():
            pytesseract.pytesseract.tesseract_cmd = c
            break
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def available() -> bool:
    return _configure()


def version() -> str | None:
    if not _configure():
        return None
    import pytesseract

    try:
        return str(pytesseract.get_tesseract_version())
    except Exception:
        return None


def extract_text(data: bytes, mime_type: str | None) -> str:
    mime = (mime_type or "").lower()
    if mime == "application/pdf" or data[:5] == b"%PDF-":
        return _pdf_text(data)
    if mime.startswith("text/"):
        try:
            return data.decode("utf-8", errors="ignore")
        except Exception:
            return ""
    if not _configure():
        return ""
    try:
        from PIL import Image
        import pytesseract

        img = Image.open(io.BytesIO(data))
        return pytesseract.image_to_string(img)
    except Exception:
        return ""


def _pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        return ""


# ---------- field parsing ----------
_MONEY = re.compile(r"(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)", re.IGNORECASE)
_INCOME_LINE = re.compile(
    r"(?:annual\s+income|total\s+income|income)[^\d₹]*(?:₹|rs\.?|inr)?\s*([\d,]+)",
    re.IGNORECASE,
)
_NAME_LINE = re.compile(
    r"(?:^name|\bname|shri|smt)[:\s]+([A-Z][A-Za-z][A-Za-z .]{2,40})", re.IGNORECASE | re.MULTILINE
)
_CERT_NO = re.compile(r"(?:certificate|cert|ref|no|number)[.:\s#]*([A-Z]{1,4}[-/ ]?\d{3,})", re.IGNORECASE)
_DATE = re.compile(r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})")


def _to_int(s: str) -> int | None:
    try:
        return int(s.replace(",", "").split(".")[0])
    except ValueError:
        return None


def parse_fields(text: str, doc_type: str) -> dict:
    """Best-effort structured extraction from raw OCR text."""
    fields: dict = {}
    if not text:
        return fields

    name = _NAME_LINE.search(text)
    if name:
        fields["name"] = name.group(1).strip()

    if doc_type == "income_certificate":
        m = _INCOME_LINE.search(text) or _MONEY.search(text)
        if m:
            val = _to_int(m.group(1))
            if val and val >= 1000:  # ignore stray small numbers
                fields["income"] = val
        cert = _CERT_NO.search(text)
        if cert:
            fields["cert_no"] = cert.group(1).strip()

    d = _DATE.search(text)
    if d:
        fields["date"] = d.group(1)

    return fields
