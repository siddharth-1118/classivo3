# SRM Student Companion

Production-oriented Next.js app for SRMIST students to sign in to this app, connect their own SRMIST portal account, manually solve the official captcha, and view parsed student portal snapshots in a dashboard.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Prisma with SQLite for local development
- PostgreSQL-ready Prisma runtime adapters for production
- HTTP-only app session cookies
- Axios + cookie jar SRMIST portal connector
- Cheerio parser modules for profile, grades, hostel, and exam timetable pages

## Local Setup

```bash
npm install
npx prisma generate
npm run dev
```

Open `http://localhost:3000`.

The local SQLite database is `prisma/dev.db`. It has been initialized for local development. If you delete it, recreate tables from `prisma/schema.prisma`; Prisma 7 may currently emit invalid SQLite JSON DDL for this schema, so use SQLite `TEXT` columns for JSON snapshot fields when manually initializing.

## Environment

Copy `.env.example` to `.env`.

Important values:

- `DATABASE_URL="file:./dev.db"` for local SQLite
- `MOCK_MODE=true` for local demo data and mock captcha
- `PORTAL_BASE_URL=https://sp.srmist.edu.in`
- `PORTAL_LOGIN_PATH=/srmiststudentportal/students/loginManager/youLogin.jsp`
- `DEBUG_SNAPSHOTS=true` to save temporary raw HTML in `data/debug`

For production, use a PostgreSQL `DATABASE_URL` and set `MOCK_MODE=false`.

## User Flow

1. Register or sign in to SRM Student Companion at `/login`.
2. Connect the SRMIST portal at `/connect`.
3. The backend starts a temporary portal login session and fetches the captcha.
4. The user manually enters NetID, password, and captcha.
5. The backend submits those values to the official SRMIST portal.
6. Portal cookies stay server-side only.
7. Parsed snapshots are available in Dashboard, Profile, Grades, Hostel, and Exam Timetable pages.

## Security Notes

- Portal passwords are never persisted after login submission.
- Portal cookies are not exposed to browser JavaScript.
- App auth uses HTTP-only cookies.
- Portal connection attempts are rate limited and logged through `ConsentLog`.
- Users can disconnect/revoke the portal connection from Settings.
- Debug HTML snapshots should stay disabled in production.

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/portal/captcha`
- `POST /api/portal/refresh-captcha`
- `POST /api/portal/connect`
- `GET /api/portal/profile`
- `GET /api/portal/dashboard`
- `GET /api/portal/grades`
- `GET /api/portal/hostel`
- `GET /api/portal/exams`
- `POST /api/portal/refresh-all`
- `POST /api/portal/disconnect`

## Verification

```bash
npm run typecheck
npm run build
```

Both commands pass in the current workspace.
