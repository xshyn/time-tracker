import type { TimeSession } from "./types";

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function minutesBetween(checkInAt: string, checkOutAt: string | null): number {
  if (!checkOutAt) return 0;
  const ms = new Date(checkOutAt).getTime() - new Date(checkInAt).getTime();
  return ms > 0 ? Math.round(ms / 60000) : 0;
}

export function sessionMinutes(s: TimeSession): number {
  return minutesBetween(s.checkInAt, s.checkOutAt);
}

export function dayTotalMinutes(sessions: TimeSession[]): number {
  return sessions.reduce((acc, s) => acc + sessionMinutes(s), 0);
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "fa" ? "fa-IR" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateLong(dateKey: string, locale: string): string {
  const d = parseDateKey(dateKey);
  return d.toLocaleDateString(locale === "fa" ? "fa-IR" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function daysInMonth(year: number, month: number): string[] {
  // month is 1-12
  const n = new Date(year, month, 0).getDate();
  const out: string[] = [];
  for (let d = 1; d <= n; d++) {
    out.push(`${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

/** true when `candidate` overlaps any session in `others` (open sessions count as running until now) */
export function overlaps(
  candidate: { checkInAt: string; checkOutAt: string | null },
  others: { checkInAt: string; checkOutAt: string | null }[],
): boolean {
  const cStart = new Date(candidate.checkInAt).getTime();
  const cEnd = candidate.checkOutAt ? new Date(candidate.checkOutAt).getTime() : Date.now();
  return others.some((o) => {
    const oStart = new Date(o.checkInAt).getTime();
    const oEnd = o.checkOutAt ? new Date(o.checkOutAt).getTime() : Date.now();
    return cStart < oEnd && oStart < cEnd;
  });
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
