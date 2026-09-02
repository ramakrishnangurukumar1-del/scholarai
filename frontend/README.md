# ScholarAI — Frontend (Phase 1)

React + TypeScript + Vite + Tailwind v4. All data comes from a **mock API layer**
(`src/lib/mockApi.ts`) whose methods mirror the planned FastAPI endpoints in
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) §4. Phase 2 swaps that file for a real
axios client without touching feature components.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc -b && vite build
```

## Demo login

`/login` → pick a role (student / authority / admin). Session is stored in
`localStorage`; no password in Phase 1.

## Structure

```
src/
  lib/          types, cn helper, auth context, mockApi
  data/         mock.ts — scholarships, applications, notifications
  components/
    ui/         Button, Card, Badge, StatusPill, Stepper, Timeline, ProgressBar…
    layout/     PublicNav, DashboardLayout (role-based sidebar)
  features/
    landing/    LandingPage
    auth/       LoginPage
    student/    Dashboard, Scholarships, ScholarshipDetail, ApplicationWizard,
                ApplicationsList, ApplicationDetail, Notifications
    authority/  Dashboard, ApplicationsTable, ReviewPage, Analytics
    admin/      AdminScholarships, AdminUsers
  router.tsx    routes + RequireRole guard
```

## Demo flow (matches the brief's Scene 1–13)

1. Landing → Login as **student**
2. Dashboard → Scholarships → open **Merit Excellence** → Apply
3. Wizard: Personal → Academic → Financial → **Documents**
   (tick "Demo: mismatch" then Browse files) → Review shows the income mismatch → Submit
4. Application detail → timeline + AI verification result, expand the income
   certificate row to see the mismatch analysis
5. Logout → Login as **authority** → `/authority/applications/app-3`
   (SCH-10231, flagged) → AI Analysis tab → ask the AI assistant
   "Why was this application flagged?" → Approve / Reject / Request Correction
