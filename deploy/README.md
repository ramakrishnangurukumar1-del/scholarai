# Infrastructure

The full stack, containerised. Everything degrades gracefully — the app also runs
with just Python + a database (see the root README) — but this brings up the
complete architecture from the problem statement.

```
                         ┌─────────────┐
   browser ─── :8080 ───►│  gateway    │  nginx — single entry point
                         │ (edge/API)  │
                         └──┬───────┬───┘
                    /api,/docs      /  (everything else)
                        │           │
                  ┌─────▼────┐  ┌───▼──────┐
                  │ backend  │  │ frontend │  React (static)
                  │ FastAPI  │  └──────────┘
                  │ + OCR    │
                  └──┬────┬──┘
             publishes│    │reads/writes
                events│    │
              ┌───────▼─┐ ┌▼──────────────────────┐
              │  kafka  │ │  db                   │
              │ (KRaft) │ │  PostgreSQL +         │
              └────┬────┘ │  TimescaleDB          │
                   │      └───────────────────────┘
              ┌────▼────┐         ▲
              │ worker  │─────────┘  writes events into
              │(consumer)│           the analytics hypertable
              └─────────┘
```

## Run it with Docker Compose

```bash
# from the repo root
docker compose up --build
```

Then open **http://localhost:8080**. First start takes a few minutes (pulls
images, builds, waits for Kafka + DB, runs migrations, seeds demo data).

- App + API behind one origin → http://localhost:8080
- API docs → http://localhost:8080/docs
- `GET /health` shows every subsystem:
  `database: up · ocr: tesseract [...] · assistant: ... · events: kafka (kafka:9092)`

Optional — put a `GOOGLE_API_KEY` in a root `.env` to enable the real LLM assistant.

## What each piece covers

| Problem-statement tech | Here |
|---|---|
| **PostgreSQL** | `db` service — the app's `DATABASE_URL` points at it |
| **TimescaleDB** | same container (`timescale/timescaledb` image); `analytics_events` is a hypertable; `/analytics` reads it with `time_bucket()` |
| **Apache Kafka** | `kafka` service (KRaft, no ZooKeeper); every submit/decision publishes to `scholarai.events` |
| **Docker** | `backend/Dockerfile`, `frontend/Dockerfile`, this compose file |
| **Kubernetes** | `deploy/k8s/` — `kubectl apply -k deploy/k8s` |
| **Edge / API Gateway** | `gateway` (nginx) in compose; an Ingress in k8s |
| **MQTT** | not used — Kafka covers the "Kafka / MQTT" requirement |

## Run on Kubernetes

```bash
# build images into your cluster's registry first, tagged:
#   scholarai-backend:latest   (docker build -t scholarai-backend:latest ./backend)
#   scholarai-frontend:latest  (docker build -t scholarai-frontend:latest ./frontend)

kubectl apply -k deploy/k8s
kubectl -n scholarai get pods
```

An Ingress controller (e.g. ingress-nginx) exposes it on the cluster IP.
Set a real `JWT_SECRET` in `deploy/k8s/00-namespace-config.yaml` before applying.
