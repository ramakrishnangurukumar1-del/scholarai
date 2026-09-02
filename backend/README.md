# ScholarAI — Backend (Phase 2)

FastAPI + SQLAlchemy. **Local dev uses MySQL** (`scholarai` database, viewable in MySQL Workbench).
Phase 2 goal (done): `/health` and `/api/v1/scholarships` working against a real database.

## Setup (one time)

**1. Create the database** — in MySQL Workbench, run:

```sql
CREATE DATABASE scholarai;
CREATE USER 'scholarai'@'localhost' IDENTIFIED BY 'scholarai123';
GRANT ALL PRIVILEGES ON scholarai.* TO 'scholarai'@'localhost';
FLUSH PRIVILEGES;
```

**2. Backend** — from `D:\scholar ai\backend`:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m scripts.init_db     # creates 14 tables in the scholarai database
python -m scripts.seed        # 4 scholarships + 3 demo users
```

Connection string lives in `.env` (`DATABASE_URL=mysql+pymysql://scholarai:scholarai123@127.0.0.1:3306/scholarai`).

## Run

```bash
.venv\Scripts\activate
uvicorn app.main:app --reload
```

- Health: http://localhost:8000/health
- Scholarships: http://localhost:8000/api/v1/scholarships
- API docs: http://localhost:8000/docs

## Demo accounts (in the DB after seeding)

| Email | Role | Password |
|---|---|---|
| student@scholarai.dev | student | password123 |
| authority@scholarai.dev | authority | password123 |
| admin@scholarai.dev | admin | password123 |

Login endpoints come in Phase 3.

## OCR (document reading)

Document extraction uses **Tesseract**. It's optional — without it, the income
value falls back to what the student typed in the form.

**To enable real OCR on images/PDFs:**

1. Download the installer: <https://github.com/UB-Mannheim/tesseract/wiki>
   (`tesseract-ocr-w64-setup-*.exe`, ~50 MB)
2. Run it, accept the default path `C:\Program Files\Tesseract-OCR`
3. Restart the backend. `GET /health` should now show `"ocr": "tesseract 5.x"`.

(If you install it elsewhere, set `TESSERACT_CMD=C:\path\to\tesseract.exe` in `.env`.)

**Sample documents to test with:**

```bash
python -m scripts.make_demo_docs      # writes demo_docs/*.png
```

Upload `demo_docs/income_certificate_mismatch.png` in the wizard to see OCR read
₹2,40,000 and flag the application.

## View the data

- **MySQL Workbench** — connect, expand the `scholarai` schema, click any table → "Select Rows".
- Or: `python -m scripts.inspect_db`
- Or: http://localhost:8000/docs

## Reset the database

In Workbench: `DROP DATABASE scholarai; CREATE DATABASE scholarai;` then:

```bash
python -m scripts.init_db
python -m scripts.seed
```

## Other databases

Models are portable. To use SQLite or PostgreSQL instead, change `DATABASE_URL` in `.env`:

```
DATABASE_URL=sqlite:///./scholarai.db
DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
```

then re-run `init_db` + `seed`.

## Layout

```
app/
  main.py            FastAPI app, /health, CORS
  core/config.py     settings from .env
  core/security.py   password hashing
  db/                engine, session, Base
  models/            14 SQLAlchemy models (ARCHITECTURE.md schema)
  schemas/           Pydantic response models
  api/v1/            routers: scholarships, scholarship-categories
scripts/
  init_db.py         create tables
  seed.py            demo data
alembic/             migrations (optional; init_db is fine for now)
```
