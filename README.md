# ScholarAI

**Scholarships, made intelligent.** An AI-assisted scholarship management platform that
digitises the full workflow: **Apply → Verify → Review → Approve → Track**.

Students discover and apply for scholarships; uploaded documents are read with OCR and
checked for inconsistencies; scholarship officers review an explainable summary and make
the final decision; students track everything in real time.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS, TanStack Query |
| Backend | Python 3.12+, FastAPI, SQLAlchemy 2.0, Alembic |
| Database | MySQL (also runs on SQLite / PostgreSQL — one env var) |
| Auth | JWT access + refresh, PBKDF2 hashing, role-based access |
| OCR | Tesseract (`pytesseract`) |
| Assistant | Deterministic grounded responder; optional Google Gemini LLM |

Deferred by design (add only when load demands it): Kafka, TimescaleDB, Docker/K8s.

---

## Run it locally

### 1. Database — MySQL

In MySQL Workbench (or any client):

```sql
CREATE DATABASE scholarai;
CREATE USER 'scholarai'@'localhost' IDENTIFIED BY 'scholarai123';
GRANT ALL PRIVILEGES ON scholarai.* TO 'scholarai'@'localhost';
FLUSH PRIVILEGES;
```

*(Or skip MySQL entirely: set `DATABASE_URL=sqlite:///./scholarai.db` in `backend/.env`.)*

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env             # macOS/Linux: cp .env.example .env
python -m scripts.init_db          # create tables
python -m scripts.seed             # 4 scholarships + 3 demo users
uvicorn app.main:app --reload
```

API → http://localhost:8000 · docs → http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App → http://localhost:5173

### Demo accounts (password `password123`)

| Role | Email |
|---|---|
| Student | `student@scholarai.dev` |
| Authority | `authority@scholarai.dev` |
| Admin | `admin@scholarai.dev` |

---

## Optional add-ons

- **Real OCR on images/PDFs** — install [Tesseract for Windows](https://github.com/UB-Mannheim/tesseract/wiki). `GET /health` shows the version. `python -m scripts.make_demo_docs` generates sample certificate images.
- **Real LLM assistant** — get a free key from [aistudio.google.com](https://aistudio.google.com), put `GOOGLE_API_KEY=...` in `backend/.env`. Without it the assistant returns a deterministic grounded answer.

---

## Demo script (the full story)

1. Register a student account (or use the demo button)
2. Dashboard → AI-matched scholarship recommendations
3. Open a scholarship → **Apply** → fill the 6-step wizard
4. Documents step → upload `backend/demo_docs/income_certificate_mismatch.png`
   → OCR reads **₹2,40,000**
5. Submit → verification pipeline flags the income mismatch
6. Log out → log in as **Authority** → open the flagged application
7. Ask the assistant *"Why was this flagged?"* → grounded explanation
8. **Approve** with a remark → student is notified
9. Student's tracking timeline updates → shows on the analytics dashboard

`python -m scripts.reset` restores a clean demo state.

---

## Tests

```bash
cd backend && pytest        # 22 API tests: auth, scholarships, workflow, RBAC, analytics
```

---

## Deployment

See [DEPLOY.md](DEPLOY.md) — free-tier deploy to Render (API) + Vercel (frontend) +
Railway (MySQL). No Docker required.

---

## Project layout

```
backend/
  app/
    main.py            FastAPI app, /health, error handler
    core/              config, security (JWT+hash), deps (RBAC), rate limit
    db/                engine, session, Base
    models/            14 SQLAlchemy models
    schemas/           Pydantic request/response
    api/v1/            auth, scholarships, students, applications, authority, analytics
    services/          eligibility (rules engine), applications (submit pipeline),
                       ocr, assistant, llm
  scripts/             init_db, seed, reset, make_demo_docs, inspect_db
  tests/               pytest suite
  alembic/             migrations
frontend/
  src/
    lib/               apiClient, auth, per-domain API modules
    components/         ui primitives, layouts
    features/           landing, auth, student, authority, admin
```

Architecture, schema, and the full phase-by-phase roadmap: [ARCHITECTURE.md](ARCHITECTURE.md).
