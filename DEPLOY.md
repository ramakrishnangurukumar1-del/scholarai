# Deploying ScholarAI

Free-tier, no Docker. ~30 minutes, mostly waiting on builds.

```
Frontend (Vercel)  ──HTTPS──►  API (Render)  ──►  MySQL (Railway)
```

---

## 0. Push to GitHub (one time)

```bash
cd "D:\scholar ai"
git init
git add .
git commit -m "ScholarAI"
git branch -M main
git remote add origin https://github.com/<you>/scholar-ai.git
git push -u origin main
```

---

## 1. MySQL — Railway

1. [railway.app](https://railway.app) → **New Project** → **Provision MySQL**
2. Open the MySQL service → **Variables** / **Connect** tab → copy the connection URL.
   It looks like `mysql://user:pass@host:port/railway`.
3. **Convert it** for SQLAlchemy — change the scheme to `mysql+pymysql://`:
   `mysql+pymysql://user:pass@host:port/railway`

*(Alternatives: PlanetScale, Aiven — both free MySQL. Same idea: get a connection URL.)*

---

## 2. API — Render

1. [render.com](https://render.com) → **New** → **Blueprint** → connect your GitHub repo.
   Render reads `render.yaml` and creates the `scholarai-api` web service.
2. In the service's **Environment**, set:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the `mysql+pymysql://…` URL from step 1 |
   | `CORS_ORIGINS` | your Vercel URL (fill in after step 3), e.g. `https://scholar-ai.vercel.app` |
   | `GOOGLE_API_KEY` | *(optional)* your Gemini key |

   `JWT_SECRET` and `APP_ENV=prod` are set automatically by the blueprint.
3. Deploy. The start command runs `alembic upgrade head` (creates tables) then uvicorn.
4. Once live, seed it once — in the Render **Shell** tab:
   ```bash
   python -m scripts.seed
   ```
5. Check `https://<your-api>.onrender.com/health`.

---

## 3. Frontend — Vercel

1. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
2. **Root Directory:** `frontend`. Vercel detects Vite from `vercel.json`.
3. **Environment Variables:**
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<your-api>.onrender.com/api/v1` |
4. Deploy → you get `https://<project>.vercel.app`.

---

## 4. Connect the two

Go back to Render → set `CORS_ORIGINS` to the Vercel URL (no trailing slash) → redeploy.

Done. Open the Vercel URL and log in with a demo account.

---

## Notes

- **Render free tier sleeps** after 15 min idle; first request after that takes ~30s to wake.
- **`git push` auto-deploys** both services from then on.
- CI (`.github/workflows/ci.yml`) runs the test suite + frontend build on every push.
- To change the schema later: edit models → `alembic revision --autogenerate -m "..."` →
  commit. Render runs `alembic upgrade head` on the next deploy.
