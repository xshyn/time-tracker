"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRequireAuth, useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { listSessions, listTasks } from "@/lib/backend";
import { formatMinutes, todayKey } from "@/lib/dates";
import {
  JALALI_WEEKDAYS_FA_SHORT,
  faNum,
  formatJalaliMonth,
  jalaaliMonthLength,
  jalaliToday,
  toGregorianKey,
} from "@/lib/jalali";
import { Card } from "@/components/ui";

const EN_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const { dict, lang, dir } = useLang();
  const fa = lang === "fa";

  const now = new Date();
  const [enYear, setEnYear] = useState(now.getFullYear());
  const [enMonth, setEnMonth] = useState(now.getMonth() + 1);
  const [jy, setJy] = useState(() => jalaliToday().jy);
  const [jm, setJm] = useState(() => jalaliToday().jm);
  const [minutesByDay, setMinutesByDay] = useState<Record<string, number>>({});

  // Gregorian range covering the visible month (either calendar).
  const range = useMemo<[string, string]>(() => {
    if (!fa) {
      const p = (n: number) => String(n).padStart(2, "0");
      return [`${enYear}-${p(enMonth)}-01`, `${enYear}-${p(enMonth)}-31`];
    }
    return [toGregorianKey(jy, jm, 1), toGregorianKey(jy, jm, jalaaliMonthLength(jy, jm))];
  }, [fa, enYear, enMonth, jy, jm]);

  useEffect(() => {
    if (!authUser) return;
    void (async () => {
      const [sessions, tasks] = await Promise.all([listSessions(authUser.id, range[0], range[1]), listTasks(authUser.id, range[0], range[1])]);
      const map: Record<string, number> = {};
      for (const s of sessions) {
        const mins = s.checkOutAt
          ? Math.max(0, Math.round((new Date(s.checkOutAt).getTime() - new Date(s.checkInAt).getTime()) / 60000))
          : 0;
        map[s.date] = (map[s.date] ?? 0) + mins;
      }
      for (const t of tasks) {
        if (!(t.date in map)) map[t.date] = 0;
      }
      setMinutesByDay(map);
    })();
  }, [authUser, range]);

  const cells = useMemo<({ key: string; label: string } | null)[]>(() => {
    if (!fa) {
      const first = new Date(enYear, enMonth - 1, 1);
      const out: ({ key: string; label: string } | null)[] = [];
      for (let i = 0; i < first.getDay(); i++) out.push(null);
      const total = new Date(enYear, enMonth, 0).getDate();
      const p = (n: number) => String(n).padStart(2, "0");
      for (let d = 1; d <= total; d++) out.push({ key: `${enYear}-${p(enMonth)}-${p(d)}`, label: String(d) });
      return out;
    }
    // Jalali grid: weeks start Saturday. Cells hold Gregorian keys for data lookup/links.
    const [gy, gm, gd] = toGregorianKey(jy, jm, 1).split("-").map(Number);
    const firstWeekday = new Date(gy ?? 1970, (gm ?? 1) - 1, gd ?? 1).getDay(); // 0=Sun..6=Sat
    const offset = (firstWeekday + 1) % 7; // Saturday-first offset
    const out: ({ key: string; label: string } | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= jalaaliMonthLength(jy, jm); d++) out.push({ key: toGregorianKey(jy, jm, d), label: faNum(d) });
    return out;
  }, [fa, enYear, enMonth, jy, jm]);

  if (loading || !user) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const monthLabel = fa
    ? formatJalaliMonth(jy, jm)
    : new Date(enYear, enMonth - 1, 1).toLocaleDateString("en-US", { year: "numeric", month: "long" });
  const weekDays = fa ? JALALI_WEEKDAYS_FA_SHORT : EN_WEEKDAYS;

  const shift = (delta: number) => {
    if (!fa) {
      const d = new Date(enYear, enMonth - 1 + delta, 1);
      setEnYear(d.getFullYear());
      setEnMonth(d.getMonth() + 1);
      return;
    }
    let nextJm = jm + delta;
    let nextJy = jy;
    if (nextJm < 1) {
      nextJm = 12;
      nextJy -= 1;
    } else if (nextJm > 12) {
      nextJm = 1;
      nextJy += 1;
    }
    setJy(nextJy);
    setJm(nextJm);
  };

  const today = fa ? jalaliToday() : null;
  const isToday = (key: string): boolean => {
    if (!fa) return key === todayKey();
    const [y, m, d] = key.split("-").map(Number);
    return toGregorianKey(today!.jy, today!.jm, today!.jd) === `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{dict.calendar.title}</h1>
        <div className="glass flex items-center gap-2 rounded-xl p-1">
          <button className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-pine" onClick={() => shift(-1)} aria-label={dict.report.prev}>
            {dir === "rtl" ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
          </button>
          <span className="min-w-28 text-center text-sm font-semibold">{monthLabel}</span>
          <button className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-pine" onClick={() => shift(1)} aria-label={dict.report.next}>
            {dir === "rtl" ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
          </button>
        </div>
      </div>
      <Card>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground" role="row">
          {weekDays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) =>
            cell === null ? (
              <div key={`e-${i}`} />
            ) : (
              <Link
                key={cell.key}
                href={`/day/${cell.key}`}
                aria-label={cell.key}
                className={`flex min-h-16 flex-col items-center justify-center rounded-xl border p-1 text-sm backdrop-blur-md transition-all duration-150 hover:border-primary-light hover:bg-pine ${
                  isToday(cell.key) ? "border-primary-light bg-card font-bold shadow-md shadow-primary/10" : "border-border bg-card/70"
                } ${cell.key in minutesByDay ? "bg-pine" : ""}`}
              >
                <span>{cell.label}</span>
                {cell.key in minutesByDay ? (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-primary-dark">
                    <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
                    {formatMinutes(minutesByDay[cell.key] ?? 0)}
                  </span>
                ) : null}
              </Link>
            ),
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ● {dict.calendar.worked} · {formatMinutes(Object.values(minutesByDay).reduce((a, b) => a + b, 0))} {dict.calendar.hours}
        </p>
      </Card>
    </div>
  );
}
