# ScholarAI — Architecture & Roadmap

> AI-assisted scholarship management platform: **Apply → Verify → Review → Approve → Track**

---

## 1. Scope for V1

Build the core system only. **No Kafka, TimescaleDB, Docker/K8s, MQTT, Edge Gateway yet.**

| Layer | V1 choice |
|---|---|
| Frontend | React + TypeScript + Vite, TailwindCSS, React Router, TanStack Query, Zustand (light) |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| DB | PostgreSQL 16 |
| Auth | JWT (access + refresh), bcrypt/argon2 hashing, role-based deps |
| Files | Local disk (`/storage`) in dev, S3-compatible interface later |
| AI | Separate `ai/` module inside the API process for V1 (OCR + rules + LLM API). Split into its own FastAPI service only when needed. |

Deferred (add only when justified): Kafka (event fan-out), TimescaleDB (analytics), Docker/K8s (deploy), MQTT/Edge (not relevant — likely drop).

---

## 2. High-level architecture (V1)

```
React SPA (Vite)
      │  REST + JWT
      ▼
FastAPI  ──►  PostgreSQL (SQLAlchemy)
      │
      ├─► AI layer (in-process module)
      │     ├─ OCR / document extraction  (pytesseract or cloud OCR)
      │     ├─ Field matching + mismatch detection (deterministic)
      │     ├─ Eligibility scoring (rules engine)
      │     ├─ Anomaly / risk scoring (rules + heuristics)
      │     ├─ Recommendation (profile ↔ scholarship criteria match)
      │     └─ Authority assistant (LLM API, grounded on application JSON)
      │
      └─► Local file storage (uploads)
```

AI is **advisory**: it writes `ai_analysis` / `eligibility_results` / `document_verifications` rows. Humans (authority) make the final `applications.status` decision.

---

## 3. Database schema (PostgreSQL)

### auth & identity

```
users
  id              uuid pk
  email           text unique not null
  password_hash   text not null
  role            enum(student, authority, admin) not null
  is_active       bool default true
  created_at      timestamptz default now()

students
  id              uuid pk
  user_id         uuid fk users unique
  full_name       text
  phone           text
  date_of_birth   date
  college         text
  course          text
  year            int
  cgpa            numeric(4,2)
  annual_income   numeric(12,2)
  family_members  int
  income_source   text
  profile_complete bool default false

authorities
  id              uuid pk
  user_id         uuid fk users unique
  full_name       text
  department      text
  -- optional scoping: which scholarships/categories they can review
```

Admins are just `users.role = 'admin'` (no extra table needed in V1).

### scholarships

```
scholarship_categories
  id              uuid pk
  name            text unique         -- Merit, Need-Based, Government, Private

scholarships
  id              uuid pk
  name            text not null
  slug            text unique
  category_id     uuid fk scholarship_categories
  description     text
  amount_max      numeric(12,2)
  provider        text
  course_filter   text[]              -- null/[] = any
  is_active       bool default true
  open_from       date
  close_on        date
  created_by      uuid fk users
  created_at      timestamptz default now()

eligibility_criteria            -- one row per rule, evaluated by rules engine
  id              uuid pk
  scholarship_id  uuid fk scholarships
  field           text              -- cgpa | annual_income | year | course | attendance
  operator        text              -- gte | lte | eq | in | between
  value           jsonb             -- 7.5  |  250000  |  ["B.Tech","B.E"]
  weight          numeric default 1 -- contribution to eligibility score
  required        bool default true -- hard gate vs soft score
```

### applications

```
applications
  id                uuid pk
  code              text unique        -- SCH-10231 (generated)
  student_id        uuid fk students
  scholarship_id    uuid fk scholarships
  status            enum(draft, submitted, ai_verification, under_review,
                         correction_requested, approved, rejected) not null
  current_step      int default 1      -- for the 6-step wizard draft
  form_data         jsonb              -- personal/academic/financial snapshot at submit
  eligibility_score numeric            -- 0-100, from AI
  risk_score        numeric            -- 0-100, from AI
  ai_flagged        bool default false
  submitted_at      timestamptz
  decided_at        timestamptz
  decided_by        uuid fk users
  created_at        timestamptz default now()
  updated_at        timestamptz

documents
  id                  uuid pk
  application_id       uuid fk applications
  doc_type            enum(identity, income_certificate, marksheet, bank, other)
  file_path           text
  file_name           text
  mime_type           text
  size_bytes          int
  verification_status enum(pending, scanned, verified, mismatch, failed) default 'pending'
  ocr_text            text
  extracted_fields    jsonb            -- {name, income, cert_no, date, ...}
  uploaded_at         timestamptz default now()

document_verifications          -- per-check result for the AI verification screen
  id              uuid pk
  document_id     uuid fk documents
  check_name      text            -- name_match | income_match | doc_detected | duplicate
  result          enum(pass, warn, fail)
  detail          jsonb           -- {declared: 180000, document: 240000}
  created_at      timestamptz default now()

eligibility_results
  id                uuid pk
  application_id     uuid fk applications
  academic_score    numeric
  income_eligible    bool
  documents_ok       bool
  criteria_breakdown jsonb          -- per-rule pass/fail + score
  overall_score     numeric         -- mirrors applications.eligibility_score
  verdict           text            -- likely_eligible | borderline | unlikely
  created_at        timestamptz default now()

ai_analysis
  id                uuid pk
  application_id     uuid fk applications
  summary_points    jsonb           -- ["Income mismatch detected", ...]
  issues            jsonb           -- [{type, severity, detail}]
  risk              text            -- LOW | MEDIUM | HIGH
  confidence        numeric         -- 0-100
  recommendation    text
  model             text            -- which model/version produced it
  created_at        timestamptz default now()
```

### workflow support

```
notifications
  id          uuid pk
  user_id     uuid fk users
  title       text
  body        text
  link        text
  is_read     bool default false
  created_at  timestamptz default now()

application_history
  id              uuid pk
  application_id   uuid fk applications
  actor_id        uuid fk users        -- null = system/AI
  action          text                 -- submitted | ai_completed | status_changed | remark_added
  from_status     text
  to_status       text
  remark          text
  created_at      timestamptz default now()

audit_logs
  id          uuid pk
  actor_id    uuid fk users
  entity      text        -- scholarship | application | user
  entity_id   uuid
  action      text        -- create | update | delete | login
  meta        jsonb
  ip          text
  created_at  timestamptz default now()
```

---

## 4. API design (FastAPI, prefix `/api/v1`)

### auth
```
POST /auth/register            {email, password, role=student}   -> creates user + student
POST /auth/login               {email, password}                 -> {access, refresh}
POST /auth/refresh             {refresh}                          -> {access}
GET  /auth/me                                                     -> current user + profile
```

### student
```
GET  /students/me/profile
PUT  /students/me/profile
GET  /students/me/applications
GET  /students/me/notifications
POST /students/me/notifications/{id}/read
GET  /students/me/recommendations                 -> AI #5
```

### scholarships
```
GET  /scholarships              ?q&category&course&page          (public/student)
GET  /scholarships/{id}
POST /scholarships/{id}/eligibility-check          {student profile}  -> quick rules preview
-- admin:
POST /scholarships
PUT  /scholarships/{id}
DELETE /scholarships/{id}
POST /scholarships/{id}/criteria
DELETE /criteria/{id}
GET  /scholarship-categories  / POST / DELETE
```

### applications
```
POST /applications                         {scholarship_id}      -> creates draft
GET  /applications/{id}
PUT  /applications/{id}/step/{n}            {form_data}           -> save wizard step
POST /applications/{id}/documents          multipart              -> upload + trigger OCR (AI #1)
DELETE /documents/{id}
POST /applications/{id}/submit                                    -> status=submitted, runs AI #1-4 pipeline
GET  /applications/{id}/verification                              -> document_verifications + ai_analysis
GET  /applications/{id}/timeline                                  -> application_history as steps
```

### authority
```
GET  /authority/dashboard                    -> counts + pipeline
GET  /authority/applications  ?status&ai_status&scholarship&q&page
GET  /authority/applications/{id}             -> full detail (tabs: application/documents/ai/history)
POST /authority/applications/{id}/decision    {action: approve|reject|request_correction, remark}
POST /authority/applications/{id}/remark      {remark}
POST /authority/applications/{id}/assistant   {question}          -> AI #6, grounded on application JSON
```

### admin
```
GET  /admin/users  ?role   / PUT /admin/users/{id}  (activate/deactivate, change role)
POST /admin/authorities
GET  /admin/analytics                          -> analytics dashboard payload
GET  /admin/audit-logs  ?entity&actor&page
```

---

## 5. Folder structure

```
scholar-ai/
├── ARCHITECTURE.md
├── docker-compose.yml            # postgres only for now
├── backend/
│   ├── pyproject.toml
│   ├── alembic/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/            config, security (jwt/hash), deps, exceptions
│   │   ├── db/              session, base
│   │   ├── models/          sqlalchemy models (one file per domain)
│   │   ├── schemas/         pydantic request/response
│   │   ├── api/v1/          routers: auth, students, scholarships,
│   │   │                             applications, authority, admin
│   │   ├── services/        business logic (application_service, workflow, notifications)
│   │   ├── ai/
│   │   │   ├── ocr.py               AI #1
│   │   │   ├── matching.py          AI #2 (mismatch detection)
│   │   │   ├── eligibility.py       AI #3 (rules engine)
│   │   │   ├── anomaly.py           AI #4 (risk scoring)
│   │   │   ├── recommend.py         AI #5
│   │   │   ├── assistant.py         AI #6 (LLM)
│   │   │   └── pipeline.py          orchestrates #1-4 on submit
│   │   └── storage/         file storage adapter
│   ├── scripts/seed.py      categories, scholarships, demo users
│   └── tests/
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.tsx, App.tsx, router.tsx
        ├── lib/            api client (axios), auth store, query client
        ├── components/     ui/ (Button, Card, Badge, Stepper...), layout/
        ├── features/
        │   ├── auth/       login, register
        │   ├── landing/    hero, problem-solution, ai-features
        │   ├── student/    dashboard, scholarships, scholarship-detail,
        │   │               application-wizard (6 steps), tracking, notifications
        │   ├── authority/  dashboard, applications-table, review-page
        │   └── admin/      users, scholarships-crud, analytics
        └── styles/
```

---

## 6. Design system (frontend)

- **Font:** Inter (or Plus Jakarta Sans for headings).
- **Palette (Tailwind tokens):**
  - `bg`: white `#FFFFFF`, `bg-subtle`: `#F7F8FA`
  - `primary` (navy): `#1E2A4A` / hover `#161F38`
  - `ai` (purple-blue): `#6366F1`
  - status: `success #16A34A`, `warning #D97706`, `danger #DC2626`
- Cards: `rounded-xl border border-gray-200 bg-white shadow-sm`, generous padding.
- Large headings, lots of whitespace. No gradients-as-decoration, no colorful template vibes.
- Component primitives to build first: `Button`, `Card`, `Badge/StatusPill`, `Stepper`, `StatCard`, `Table`, `Dropzone`, `Timeline`, `ProgressBar`.

---

## 7. AI implementation order (build & test one at a time)

| # | Feature | Approach (V1) | Output table |
|---|---|---|---|
| 1 | Document OCR / extraction | `pytesseract` on image/PDF → regex/keyword field parsing per doc_type | `documents.ocr_text`, `extracted_fields` |
| 2 | Field matching / mismatch | deterministic compare `extracted_fields` vs `form_data` (name fuzzy match, income exact/threshold) | `document_verifications` |
| 3 | Eligibility analysis | rules engine over `eligibility_criteria` + weights → 0-100 score + verdict | `eligibility_results` |
| 4 | Anomaly / risk | heuristics: mismatches, duplicate file hash, missing required docs, income outliers → risk score + level | `ai_analysis` |
| 5 | Recommendation | score every active scholarship's criteria against student profile → top N with match % | computed on request |
| 6 | Authority assistant | LLM API call with a strict system prompt + the application/document/analysis JSON as context; returns grounded explanation | returned inline (optionally logged) |

`pipeline.py` runs 1→2→3→4 synchronously on submit for V1 (fast enough). Move to background/Kafka only if it gets slow.

---

## 8. Development roadmap

**Phase 1 — Frontend shell with mock data**
Landing, login/register, student dashboard, scholarship list + detail, 6-step application wizard, authority dashboard, review page. All wired to a mock API layer so screens are real.

**Phase 2 — Backend foundation**
FastAPI app, Postgres via docker-compose, SQLAlchemy models, Alembic migration, seed script. Health check + `/scholarships` list working end to end.

**Phase 3 — Auth & RBAC**
Register/login/refresh/me, JWT deps, `require_role(...)`. Swap frontend mock auth for real.

**Phase 4 — Scholarships**
Admin CRUD + categories + criteria. Student list/detail/eligibility-check reads real data.

**Phase 5 — Applications**
Draft create, per-step save, document upload to storage, submit. Student tracking timeline + notifications.

**Phase 6 — Authority workflow**
Dashboard counts/pipeline, filtered application table, review detail tabs, decision endpoint writing `application_history` + notification to student.

**Phase 7 — AI**
Add features #1–#6 in order, each behind its own endpoint, each tested with a known-good and a known-mismatch document before moving on.

**Phase 8 — Analytics**
Admin/authority analytics endpoint + charts (applications over time, by category, approval ratio, processing time, flagged, top scholarships). Still on Postgres.

**Phase 9+ (only when justified)**
Kafka event fan-out, TimescaleDB for analytics, Docker image + compose for full stack, then K8s.

**Positioning rule (keep everywhere in UI/docs):**
> AI assists scholarship authorities by automating document verification, identifying inconsistencies, analyzing eligibility factors, and prioritizing applications for human review. The authorized officer makes the final decision.
