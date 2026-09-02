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
    # 1. embedded text layer (fast, exact) — works for digital PDFs
    embedded = ""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(data))
        embedded = "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception:
        embedded = ""
    if len(embedded.strip()) > 30:
        return embedded

    # 2. scanned PDF — render each page to an image and OCR it
    if not _configure():
        return embedded
    try:
        import pymupdf
        import pytesseract
        from PIL import Image

        doc = pymupdf.open(stream=data, filetype="pdf")
        out = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            out.append(pytesseract.image_to_string(img))
        return "\n".join(out)
    except Exception:
        return embedded


# ---------- field parsing ----------
# "Rs. 1,20,000" / "₹120000" / "Rs 120000/annum" — amount must be 4-9 digits
_RS_AMOUNT = re.compile(r"(?:₹|rs\.?|inr)\s*([\d][\d,]{3,12})", re.IGNORECASE)
# an income figure stated near the word "income"
_INCOME_NEAR = re.compile(
    r"(?:annual|family|total|monthly)?\s*income[^\n]{0,60}?(?:₹|rs\.?|inr)\s*([\d][\d,]{3,12})",
    re.IGNORECASE,
)
_NAME_WORDS = r"([A-Z][a-z]+(?:[ \t]+(?:[A-Z][a-z]+|[A-Z]\.?)){0,3})"
_NAME_CERTIFY = re.compile(
    r"certify that\s+(?:selvan|thiru|tmt|smt|shri|mr|ms|mrs|kumari)?\.?\s*" + _NAME_WORDS,
    re.IGNORECASE,
)
_NAME_LABEL = re.compile(
    r"(?:^|\n)\s*name\s*(?:of\s+(?:the\s+)?(?:applicant|candidate|student|holder))?\s*[:\-]\s*"
    + _NAME_WORDS,
    re.IGNORECASE,
)
_NAME_TRAIL = re.compile(r"\s+(?:son|daughter|s/o|d/o|w/o|wife)\b.*$", re.IGNORECASE)
_CERT_NO = re.compile(
    r"(?:certificate|cert\.?|ref\.?|serial)\s*(?:no|number|#)?\s*[:.\-]?\s*"
    r"([A-Z]{1,4}[-/ ]?\d[\d\-/]{4,20})",
    re.IGNORECASE,
)
_DATE = re.compile(r"(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})")


def _to_int(s: str) -> int | None:
    try:
        return int(s.replace(",", "").split(".")[0])
    except ValueError:
        return None


def _best_income(text: str) -> int | None:
    """Pick the most plausible annual-income figure from the OCR text."""
    candidates: list[int] = []
    for m in _INCOME_NEAR.finditer(text):
        v = _to_int(m.group(1))
        if v and 1_000 <= v <= 50_000_000:
            candidates.append(v)
    if not candidates:
        for m in _RS_AMOUNT.finditer(text):
            v = _to_int(m.group(1))
            if v and 1_000 <= v <= 50_000_000:
                candidates.append(v)
    if not candidates:
        return None
    # income certificates usually state the total once; the largest reasonable
    # "Rs." figure is almost always the annual family income.
    return max(candidates)


def parse_fields(text: str, doc_type: str) -> dict:
    """Best-effort structured extraction from raw OCR text."""
    fields: dict = {}
    if not text:
        return fields

    name = _NAME_CERTIFY.search(text) or _NAME_LABEL.search(text)
    if name:
        n = _NAME_TRAIL.sub("", name.group(1)).strip()
        if len(n) >= 3 and n.lower() not in ("of the", "of the family", "of income"):
            fields["name"] = n

    if doc_type == "income_certificate":
        val = _best_income(text)
        if val:
            fields["income"] = val
        cert = _CERT_NO.search(text)
        if cert:
            fields["cert_no"] = cert.group(1).strip()

    d = _DATE.search(text)
    if d:
        fields["date"] = d.group(1)

    return fields
