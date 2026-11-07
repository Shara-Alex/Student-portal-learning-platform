# School Management System

A modular school management platform. One running instance serves one school
(like Odoo.sh: one database per client), so there is no multi-tenant code to
reason about.

## Stack

| Layer    | Tech                                            |
|----------|-------------------------------------------------|
| Backend  | Django 5 + Django REST Framework + JWT auth      |
| Database | PostgreSQL 16 (SQLite for quick local dev)       |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS 4    |
| Deploy   | Docker Compose (nginx serves the UI, proxies /api) |

## The one rule: mirrored modules

Every feature is a *module* that exists in two places with the **same name**:

```
backend/apps/<module>/        models.py  serializers.py  views.py  urls.py  tests.py
frontend/src/modules/<module>/  types.ts  api.ts  <Module>Page.tsx
```

- Backend module mounts at `/api/<module>/` (see `backend/config/urls.py`).
- Frontend module is registered in `frontend/src/modules/registry.ts`, which
  generates both the sidebar and the routes.

Debugging a feature means opening exactly two folders.

## Modules (build order)

| # | Module          | Status  | Covers                                                  |
|---|-----------------|---------|---------------------------------------------------------|
| 1 | core            | ✅ base | School settings, users & roles, academic years, terms, login |
| 2 | students        | —       | Students, guardians, classes, enrolment                 |
| 3 | academics       | —       | Subjects, teacher assignments, timetable / day planner  |
| 4 | assessments     | —       | Tests, marking schemes, marks, weighted results, reports |
| 5 | attendance      | —       | Daily / per-lesson attendance                           |
| 6 | fees            | —       | Fee structures, invoices, payments, balances            |
| 7 | events          | —       | Calendar, announcements on the dashboard                |
| 8 | communication   | —       | Messages and notices (in-app first)                     |
| 9 | portal          | —       | Parent / student read-only views                        |

Roles: `admin`, `teacher`, `parent`, `student` (one `User` table, `role` field).

## Run locally (no Docker)

```bash
# backend
cd backend
cp .env.example .env
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser        # role defaults to student; set role=admin in /admin
python manage.py runserver              # http://localhost:8000  (API + /admin)

# frontend (second terminal)
cd frontend
npm install
npm run dev                             # http://localhost:5173  (proxies /api to :8000)
```

Run backend tests: `python manage.py test`.

## Run with Docker (same as production)

```bash
cp backend/.env.example backend/.env    # set SECRET_KEY, DEBUG=0, ALLOWED_HOSTS
docker compose up --build               # http://localhost
docker compose exec backend python manage.py createsuperuser
```

Deploying a new school on DigitalOcean = new droplet, clone repo, edit `.env`,
`docker compose up -d`.
