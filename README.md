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
  generates the home screen's app tiles, the top bar menu and the routes.

Debugging a feature means opening exactly two folders.

## Modules (build order)

| #  | Module          | Status  | Covers                                                  |
|----|-----------------|---------|---------------------------------------------------------|
| 1  | core            | ✅ base | School settings, users & roles, academic years, terms, login |
| 2  | students        | ✅      | Students, guardians, classes, enrolment, medical info, year-end promotion |
| 3  | academics       | ✅      | Subjects, teacher assignments, periods, timetable, teacher's own timetable |
| 4  | assessments     | —       | Tests, marking schemes, marks, grading scales, weighted results, report cards, transcript |
| 5  | attendance      | —       | Daily / per-lesson attendance                           |
| 6  | fees            | —       | Fee structures, payment plans, late fees, invoices, payments, balances |
| 7  | events          | —       | Calendar, announcements on the dashboard                |
| 8  | communication   | —       | Messages and notices (in-app first)                     |
| 9  | portal          | —       | Parent / student read-only views                        |
| 10 | admissions      | —       | Online application form, document upload, review, convert to student |

### Later, as we expand

Parked on purpose. Each one slots into an existing module when a school needs it.

| Feature                         | Goes in        |
|---------------------------------|----------------|
| Homework submission by students | assessments    |
| Lesson plans                    | academics      |
| Discipline records              | new module     |
| Student ID cards (barcode / QR) | students       |
| Attendance kiosk (scan in/out)  | attendance     |
| Online fee payments             | fees           |
| Scholarships                    | fees           |
| Service hours                   | new module     |
| Staff attendance and leave      | new module     |

Roles: `admin`, `teacher`, `parent`, `student` (one `User` table, `role` field).

## Look and feel: the Homeroom design system

The frontend follows **Homeroom** (chalkboard green, school-bus yellow, exercise-book paper).

- `frontend/src/styles/tokens.css` holds every colour, font, radius and shadow, in two themes:
  Paper (light) and Chalkboard (dark). Change a value there and the whole app follows.
- `frontend/src/styles/homeroom.css` holds the ready-made component classes (`hr-btn`,
  `hr-list`, `hr-badge`, `hr-topbar`, `hr-app`, `hr-stat` ...).
- `frontend/src/components/ui/` wraps those classes as React components. Modules use these and
  never write colours themselves.
- Colours are a code: green = good / present / paid, yellow = waiting / late / today,
  red = absent / overdue / destructive, blue = draft / info, purple = subject tags only.
- One green (primary) button per screen.

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
