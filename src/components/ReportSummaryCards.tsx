"use client";

import { CalendarDays, CalendarOff, Clock3, House } from "lucide-react";
import { formatMinutes, formatNumber } from "@/lib/dates";
import type { Dict } from "@/lib/i18n/en";

export function ReportSummaryCards({
  totalMinutes,
  daysWorked,
  remoteDays,
  offDays,
  lang,
  dict,
}: {
  totalMinutes: number;
  daysWorked: number;
  remoteDays: number;
  offDays: number;
  lang: "en" | "fa";
  dict: Dict;
}) {
  const metrics = [
    {
      label: dict.report.totalHours,
      value: formatMinutes(totalMinutes, lang),
      Icon: Clock3,
      tone: "primary",
    },
    {
      label: dict.report.daysWorked,
      value: formatNumber(daysWorked, lang),
      Icon: CalendarDays,
      tone: "accent",
    },
    {
      label: dict.report.remoteDays,
      value: formatNumber(remoteDays, lang),
      Icon: House,
      tone: "neutral",
    },
    {
      label: dict.report.offDays,
      value: formatNumber(offDays, lang),
      Icon: CalendarOff,
      tone: "leave",
    },
  ] as const;

  return (
    <section className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4" aria-label={dict.report.title}>
      {metrics.map(({ label, value, Icon, tone }) => (
        <article
          key={label}
          className={`relative min-w-0 overflow-hidden rounded-2xl border bg-card/85 p-3 shadow-sm sm:rounded-3xl sm:p-5 ${
            tone === "primary"
              ? "border-primary/20"
              : tone === "accent"
                ? "border-accent/25"
                : tone === "leave"
                  ? "border-amber-500/25"
                : "border-border"
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute inset-x-0 top-0 h-1 ${
              tone === "primary" ? "bg-primary-light" : tone === "accent" ? "bg-accent" : tone === "leave" ? "bg-amber-500" : "bg-muted-foreground/35"
            }`}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[10px] font-semibold text-muted-foreground sm:text-sm">{label}</p>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 sm:rounded-xl ${
                tone === "primary"
                  ? "bg-primary/10 text-primary-light"
                  : tone === "accent"
                    ? "bg-accent/15 text-accent-dark dark:text-accent-light"
                    : tone === "leave"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon size={16} aria-hidden="true" />
            </span>
          </div>
          <p className="mt-2 truncate text-base font-extrabold tabular-nums tracking-tight text-foreground sm:mt-4 sm:text-3xl">
            {value}
          </p>
        </article>
      ))}
    </section>
  );
}
