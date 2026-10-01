# ⏱️ Work Time & Task Tracker

> Log your hours. Flag remote days. Export your month. 🏠📊

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-optional-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![i18n](https://img.shields.io/badge/i18n-EN_%7C_FA-blue?style=flat-square)](./src/lib/i18n)
[![PWA](https://img.shields.io/badge/PWA-ready-purple?style=flat-square)](./public/manifest.json)

Multi-user PWA for daily check-in / check-out sessions + tasks, with a monthly report you can actually send to a manager. English + Persian (RTL, Jalali calendar). Works offline-first in the browser, syncs to Supabase when you want cloud.

---

## ✨ What it does

| Area | Details |
|------|---------|
| 🕘 **Sessions** | Check in/out, manual entries, overlap warnings, notes |
| 🏠 **Remote flag** | One toggle per day + per-session override — hybrid days just work |
| ✅ **Tasks** | Per-day list, done/active filters, quick-add from home |
| 📅 **Calendar** | Gregorian + Jalali views, `🏠` marks remote days |
| 📊 **Report center** | Year grid ↔ month report views, plus an Export button opening the all-options dialog: tick months (or whole year) → one Excel (Summary + per-month sheets) or one PDF |
| 🌍 **Bilingual** | EN / FA with one click, RTL-aware PDF & Excel |
| 🔌 **Backends** | LocalStorage (zero setup) ↔ Supabase (multi-device) with one-click migration |

### 🏠 Remote, explained in 10 seconds

```
Day view  →  [🏠 Remote day ✓]   sets the default for the whole date
Session   →  [🏠 Remote ✓]       override a single check-in/out (hybrid days)
List      →  🏠 Remote · Hybrid · Onsite badges everywhere
Export    →  new “Remote” column in Excel + PDF, remote-days count in footer
```

- Old data? Defaults to **onsite** — nothing breaks.
- Empty day? The day toggle still remembers your choice for the next session.
- Hybrid day? Mark the day onsite, flip just the remote session — the day shows **Hybrid** automatically.

---

## 🚀 Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 → sign up → start logging. No external services required.

> Without Supabase env vars the app uses a built-in per-browser backend (localStorage, one account per email, data isolated per user id).

---

## ☁️ Cloud backend (Supabase, free tier)

1. Create a free project at https://supabase.com
2. In the SQL editor, run `supabase/schema.sql` — creates `profiles`, `time_sessions`, `tasks`, **`day_flags`** with RLS (`user_id = auth.uid()`).
   > Already ran an older schema? **Re-run the file.** The `alter table … add column if not exists` lines add `is_done` / `completed_at` / **`is_remote`** and the new `day_flags` table — safe to run twice.
3. Copy URL + anon key into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ…
   ```
4. Restart the app. Auth + data now live in Postgres; the UI is unchanged — including 🏠 flags, which migrate with one click from Settings.

---

## 📦 Deploy

<details>
<summary><b>Netlify</b> (recommended for this repo)</summary>

- Build command: `npm run build` · Publish: `.next` (see `netlify.toml`)
- Add env vars in **Site settings → Environment variables**:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Leave both unset for local-only mode — the deployed app still works.

</details>

<details>
<summary><b>Vercel</b></summary>

```bash
vercel
```

Or connect the repo in the dashboard + add the same two `NEXT_PUBLIC_SUPABASE_*` vars.

</details>

---

## ✅ Checks

```bash
npm run typecheck          # tsc --noEmit
npm run build              # production build
node ./scripts/logic-test.mjs   # durations, overlap, monthly totals
```

---

## 🗺️ Not doing (on purpose)

- No GPS / IP auto-detect for remote — manual toggle is private + predictable.
- No free-text locations (“home”, “client”, …) — one boolean keeps lists + exports clean.
- No split remote/onsite hour totals — one Remote column + remote-days count is enough.

> Built with Next.js 15 · Supabase · Tailwind · `xlsx` · Vazirmatn + Plus Jakarta Sans.
