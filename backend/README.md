---
title: ScholarAI API
emoji: 🎓
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 8000
pinned: false
---

# ScholarAI API

FastAPI backend for the ScholarAI scholarship management platform —
authentication, scholarship catalogue, the application + verification
pipeline (OCR, eligibility scoring), the authority workflow and analytics.

Runs as a container: `docker build -t scholarai-api . && docker run -p 8000:8000 scholarai-api`.

| Path | |
|---|---|
| `GET /health` | subsystem status (database, OCR, assistant) |
| `GET /docs` | interactive API docs |

Configuration is via environment variables — see `.env.example`. The only
ones required in a deployment are `DATABASE_URL`, `JWT_SECRET` and
`APP_ENV=prod`; `CORS_ORIGINS` should list the frontend URL.
