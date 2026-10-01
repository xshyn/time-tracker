# Work Time & Task Tracker — Product & Technical Spec

## 1. Summary

A multi-user, installable web app (PWA) for tracking daily work check-in/check-out times and the tasks completed each day. The primary use case: an employee whose company has no attendance system needs a reliable personal log they can export at the end of the month to claim/report their worked hours to the employer. The app is not limited to a single user — any visitor can sign up and use it for their own tracking, with full data isolation between accounts.

The app must support English and Persian (Farsi) UI, including full RTL layout for Farsi, and must be deployable on a free hosting tier (target: Vercel).

## 2. Goals

- Let a user log check-in and check-out times for each work day.
- Let a user log the tasks/work items completed on each day.
- Let a user generate and export a monthly report (PDF and Excel) summarizing daily hours and tasks, suitable for submission to an employer.
- Support multiple independent user accounts, each seeing only their own data.
- Support English and Persian, with a language switcher and correct RTL rendering for Persian.
- Be installable as a PWA (native-app-like experience: home screen icon, standalone window, responsive on mobile and desktop).
- Run entirely on free-tier infrastructure (hosting + database + auth).

## 3. Out of Scope (for v1)

- Team/manager views, approvals, or multi-user visibility into each other's data.
- Push notifications / reminders.
- Native mobile app builds (iOS/Android app stores) — PWA only.
- Payroll or salary calculations beyond total hours.

## 4. Recommended Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript.
- **Styling:** Tailwind CSS (with built-in RTL support via logical properties or `dir` attribute switching).
- **Backend/DB/Auth:** Supabase (free tier) — Postgres database + built-in email/password authentication + row-level security (RLS) for per-user data isolation.
- **i18n:** `next-intl` (or `next-i18next`) for English/Persian translations and RTL layout switching.
- **PDF export:** `@react-pdf/renderer` or `pdf-lib`, generated client-side or via a serverless API route.
- **Excel export:** `xlsx` (SheetJS), generated client-side.
- **PWA:** `next-pwa` or a manually configured `manifest.json` + service worker, for installability and offline app-shell caching.
- **Hosting:** Vercel (free tier) — Next.js deploys natively; Supabase runs independently as the free-tier backend.

(The implementing agent may substitute any piece of this stack for an equivalent free-tier-compatible alternative, but should preserve: Postgres-backed persistence with per-user isolation, email/password auth, and free deployability.)

## 5. Users & Authentication

- Standard email/password sign-up and login (Supabase Auth or equivalent).
- Each authenticated user can only ever read/write their own time entries and tasks (enforce via Row-Level Security policies keyed on `user_id = auth.uid()`).
- Basic account features: sign up, log in, log out, password reset (via email).
- No admin/manager role needed in v1 — every account is a standalone individual user.
- Optional minimal profile: display name (used on report headers), preferred language.

## 6. Core Features

### 6.1 Daily Time Logging

- A user can record one or more **work sessions** per calendar day. A session = a check-in time + a check-out time (supports lunch breaks or leaving/returning during the day, not just a single in/out pair).
- Two entry modes, both must be supported:
  1. **Live clock**: a "Check in" button that stamps the current time, and a "Check out" button that stamps the current time to close the open session.
  2. **Manual entry/edit**: the user can add, edit, or delete a session for any date with a manually typed time (for forgotten clock-ins or backfilling past days).
- The day view shows all sessions for that date and the computed total hours worked that day (sum of session durations).
- Prevent/flag overlapping sessions on the same day.

### 6.2 Daily Task Logging

- For any given date, the user can add multiple short task entries (free-text description; optionally a short title + longer description).
- Tasks are associated with a date (and optionally a specific session, but date-level association is sufficient for v1).
- Tasks should be viewable, editable, and deletable from the same day view as the time sessions.

### 6.3 Calendar / Day View

- A calendar or list view where the user picks a date and sees:
  - All work sessions for that day (check-in/check-out times, computed duration).
  - All tasks logged for that day.
  - Total hours worked that day.
- Days with no data should be clearly distinguishable from days with logged data (e.g., a dot/marker on the calendar).

### 6.4 Monthly Report

- A "Monthly Report" view where the user selects a month/year and sees a table with one row per day of that month:
  - Date
  - Check-in time(s) / Check-out time(s) (or session list if multiple)
  - Total hours worked that day
  - Tasks completed that day (concatenated or listed)
  - Monthly totals row: total hours worked in the month, total days worked.
- **Export to PDF**: a clean, printable document with the user's name, the month/year, and the same table + totals — suitable for emailing to an employer or HR.
- **Export to Excel (.xlsx)**: the same data as a spreadsheet, with a header row, one row per day, and a totals row/section.
- Both exports must be triggerable from the Monthly Report view with a single click/button.

### 6.5 Internationalization (i18n) & RTL

- Full UI translation for **English** and **Persian (Farsi)**.
- A visible language switcher (e.g., in the header/settings) that persists the user's choice (stored per-account or in local storage).
- When Persian is active, the layout must switch to **RTL** (`dir="rtl"`), including mirrored navigation, correct alignment of dates/numbers, and RTL-aware component styling (not just translated text).
- Dates/times should be displayed in a locale-appropriate format for the active language (Persian users may expect Gregorian dates unless otherwise specified — assume Gregorian calendar for both languages, only UI language changes, unless the agent is told otherwise).
- Generated PDF/Excel exports should also respect the active language and RTL layout for Persian.

### 6.6 PWA / "Native Web App" Requirements

- Web app manifest (`manifest.json`) with app name, icons (multiple sizes), theme color, and `display: standalone`.
- Installable on desktop and mobile browsers (Add to Home Screen / Install App prompt).
- Responsive design: fully usable on mobile phone screens as well as desktop.
- Basic offline app-shell caching via service worker (the app shell should load even with no connection; live data sync requires connectivity, which is acceptable for v1).

## 7. Data Model (suggested)

```
users (managed by auth provider)
  id
  email
  display_name
  preferred_language  -- 'en' | 'fa'

time_sessions
  id
  user_id (FK -> users.id)
  date            -- calendar date this session belongs to
  check_in_at     -- timestamp
  check_out_at    -- timestamp (nullable while session is open)
  note            -- optional short note

tasks
  id
  user_id (FK -> users.id)
  date            -- calendar date this task belongs to
  title           -- short text
  description     -- optional longer text
```

- All tables must have Row-Level Security policies restricting access to rows where `user_id = auth.uid()`.

## 8. Non-Functional Requirements

- **Free-tier deployable**: no paid services required to run this app for a single or small number of users (Vercel free tier + Supabase free tier, or equivalent).
- **Data isolation**: strictly enforced per-user access at the database level (RLS), not just in the UI.
- **Responsive**: usable on mobile (primary daily-use device for clocking in/out) and desktop (for generating/reviewing monthly reports).
- **Simple, fast UI**: check-in/check-out should be a 1-tap action from the home screen.

## 9. Suggested Page/Route Structure

- `/login`, `/signup` — auth
- `/` (home/dashboard) — today's status, quick check-in/check-out, today's tasks
- `/day/[date]` — full day view (sessions + tasks, add/edit/delete)
- `/calendar` — month calendar overview
- `/report/[year]/[month]` — monthly report view + PDF/Excel export buttons
- `/settings` — language switcher, display name, password change

## 10. Acceptance Criteria (v1 "done")

1. A new user can sign up, log in, and log out.
2. A logged-in user can check in and check out (live) and see today's session appear.
3. A user can manually add/edit/delete a session for a past date.
4. A user can add/edit/delete tasks for any date.
5. A user can view a calendar and jump to any day's detail.
6. A user can open the monthly report for any month and see a correct per-day table with correct totals.
7. A user can export the monthly report as both PDF and Excel, and the exported files contain the correct data.
8. The UI can be switched between English and Persian at any time, and Persian renders correctly in RTL.
9. The app can be installed as a PWA on a mobile device and opens in standalone mode.
10. The app is deployed and reachable on a free-tier Vercel URL, with a free-tier Supabase (or equivalent) backend.
