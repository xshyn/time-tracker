# Work Time & Task Tracker

Multi-user PWA for logging daily check-in/check-out sessions and tasks, with monthly PDF/Excel reports. English + Persian (RTL, Jalali calendar).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, and start logging. No external services required:
without Supabase env vars the app uses a built-in per-browser backend (localStorage,
one account per email, data isolated per user id).

## Cloud backend (Supabase, free tier)

1. Create a free project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql` (creates `profiles`, `time_sessions`,
   `tasks` with RLS policies `user_id = auth.uid()`).
   Already ran an older version of the schema? Re-run the file — the
   `alter table ... add column if not exists` lines add `is_done`/`completed_at`
   to existing installs.
3. Copy the project URL + anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
4. Restart the app. Auth + data now live in Postgres; the UI is unchanged.

## Deploy (Vercel, free tier)

```bash
vercel
```

or connect the repo in the Vercel dashboard. Add the two `NEXT_PUBLIC_SUPABASE_*`
env vars if you want cloud sync; otherwise the deployed app works with the local backend.

## Checks

- `npm run typecheck`
- `npm run build`
- `node ./scripts/logic-test.mjs` — pure-logic tests (durations, overlap, monthly totals)
