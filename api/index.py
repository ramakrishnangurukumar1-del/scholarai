"""Vercel serverless entrypoint for the ScholarAI API.

Vercel runs the `app` ASGI callable directly. The FastAPI application lives in
`backend/app`, so put that directory on the import path first.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app  # noqa: E402

__all__ = ["app"]
