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
| 4  | assessments     | ✅      | Markbook, question paper and marking scheme uploads, grading scale, weighted results, teacher comments, report cards, transcript |
| 5  | attendance      | ✅      | Daily register (present / late / absent), term summary  |
| 6  | fees            | ✅      | Fee structure, billing a class, instalments, late fees, payments, statements |
| 7  | events          | ✅      | Calendar and notice board, shown on the Today screen    |
| 8  | communication   | ✅      | Private in-app messages between staff and families      |
| 9  | portal          | ✅      | Parent / student read-only views: results, attendance, fees, timetable |
| 10 | admissions      | ✅      | Public application form at /apply, stages board, enrol as a student |
| 11 | notifications   | ✅      | Emails sent out to families and staff (absences, notices), queued and logged; `send_notifications` command |
| 12 | settings        | ✅      | School details, users and passwords, academic years (frontend only; uses the core API) |

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

Roles: `admin`, `teacher`, `bursar`, `front_office`, `parent`, `student` (one `User` table, `role` field).

**Home is "Today"**, not a menu: a teacher sees today's lessons and what needs doing, the admin
sees whole-school figures and what to chase, a parent sees each child's day. The grid of apps is
behind the Apps button in the top bar. `portal` has no backend folder of its own: it only displays
what the other modules' APIs already return for a family.

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
python manage.py seed_demo               # optional: a small made-up school to try things with (prints the logins)
python manage.py createsuperuser        # or start empty: role defaults to student; set role=admin in /admin
python manage.py runserver              # http://localhost:8000  (API + /admin)

# frontend (second terminal)
cd frontend
npm install
npm run dev                             # http://localhost:5173  (proxies /api to :8000)
```

Run backend tests: `python manage.py test`.

After pulling new code, always run `python manage.py migrate` before `runserver`: new
commits can add database columns, and the API returns 500 errors until they exist.

## Run with Docker (same as production)

```bash
cp backend/.env.example backend/.env    # set SECRET_KEY, DEBUG=0, ALLOWED_HOSTS
docker compose up --build               # http://localhost
docker compose exec backend python manage.py createsuperuser
```

Deploying a new school on DigitalOcean = new droplet, clone repo, edit `.env`,
`docker compose up -d`.
