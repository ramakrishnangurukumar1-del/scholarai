import sys
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET = "dev-secret-change-me-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLite for local dev (zero setup). Use mysql+pymysql://… or postgresql+psycopg://… otherwise.
    DATABASE_URL: str = "sqlite:///./scholarai.db"
    APP_ENV: str = "dev"  # dev | prod
    CORS_ORIGINS: str = "http://localhost:5173"

    # File uploads
    STORAGE_DIR: str = "storage"
    MAX_UPLOAD_MB: int = 5
    ALLOWED_UPLOAD_TYPES: str = "image/png,image/jpeg,application/pdf,text/plain"

    # OCR — path to tesseract.exe; blank = rely on PATH / common install locations
    TESSERACT_CMD: str = ""
    # Tesseract language codes, "+"-joined; first = primary script. Needs the matching
    # .traineddata files in tessdata/. e.g. "tam+eng", "eng+hin+tam+tel+kan+mal".
    OCR_LANGUAGES: str = "eng"

    # Auth / JWT
    JWT_SECRET: str = _DEV_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Login throttle
    LOGIN_MAX_ATTEMPTS: int = 15
    LOGIN_WINDOW_SECONDS: int = 300

    # AI Review Assistant (optional). Set GOOGLE_API_KEY to enable a real LLM;
    # without it the assistant returns a deterministic grounded answer.
    GOOGLE_API_KEY: str = ""
    AI_MODEL: str = "gemini-flash-lite-latest"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def allowed_upload_types(self) -> set[str]:
        return {t.strip() for t in self.ALLOWED_UPLOAD_TYPES.split(",") if t.strip()}

    @property
    def is_prod(self) -> bool:
        return self.APP_ENV.lower() in ("prod", "production")


@lru_cache
def get_settings() -> Settings:
    s = Settings()
    if s.is_prod and s.JWT_SECRET == _DEV_SECRET:
        sys.stderr.write(
            "FATAL: APP_ENV=prod but JWT_SECRET is still the default. "
            "Set a strong JWT_SECRET in the environment.\n"
        )
        raise SystemExit(1)
    return s


settings = get_settings()
