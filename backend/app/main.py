import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import settings
from app.db.session import engine
from app.services import llm, ocr

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logging.getLogger("google_genai").setLevel(logging.ERROR)
log = logging.getLogger("scholarai")

app = FastAPI(title="ScholarAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again."},
    )


@app.get("/health", tags=["meta"])
def health() -> dict:
    db_ok = True
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    ocr_version = ocr.version()
    return {
        "status": "ok",
        "env": settings.APP_ENV,
        "database": "up" if db_ok else "down",
        "ocr": f"tesseract {ocr_version}" if ocr_version else "unavailable (manual entry)",
        "assistant": f"llm ({settings.AI_MODEL})" if llm.is_configured() else "deterministic",
    }
