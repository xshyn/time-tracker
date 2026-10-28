"use client";

import Link from "next/link";
import { House } from "lucide-react";
import { formatDateKey, formatMinutes, formatNumber } from "@/lib/dates";
import { formatJalaliLong } from "@/lib/jalali";
import type { MonthDayRow } from "@/lib/types";
import { dayRemoteStatus, monthTotals } from "@/lib/report";
import type { Dict } from "@/lib/i18n/en";
import { Card } from "./ui";

/** Shared monthly report table (day rows + totals footer), used by the month page and the report center. */
export function MonthReportTable({ rows, lang, dict }: { rows: MonthDayRow[]; lang: "en" | "fa"; dict: Dict }) {
  const totals = monthTotals(rows);
  return (
    <Card className="overflow-hidden" padding={false}>
      <div className="overflow-x-auto p-2 sm:p-3">
        <table className="w-full min-w-[54rem] border-collapse text-sm">
          <thead>
            <tr className="bg-card text-start">
              <th className="border-b border-border px-3 py-3 text-start sm:px-4">{dict.report.date}</th>
              <th className="border-b border-border px-3 py-3 text-start sm:px-4">{dict.report.sessionsCol}</th>
              <th className="border-b border-border px-3 py-3 text-start sm:px-4">{dict.report.hoursCol}</th>
              <th className="border-b border-border px-3 py-3 text-start sm:px-4">{dict.report.tasksCol}</th>
              <th className="border-b border-border px-3 py-3 text-start sm:px-4">
                <span className="inline-flex items-center gap-1">
                  <House size={12} className="text-primary-light" aria-hidden="true" />
                  {dict.report.remoteCol}
                </span>
              </th>
              <th className="border-b border-border px-3 py-3 text-start sm:px-4">{dict.report.leaveCol}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date} className="border-b border-muted align-top last:border-0">
                <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                  <Link href={`/day/${r.date}`} className="text-primary-light hover:underline">
                    {lang === "fa" ? formatJalaliLong(r.date) : r.date}
                  </Link>
                  {lang === "fa" ? <div className="text-[11px] text-muted-foreground">{formatDateKey(r.date, lang)}</div> : null}
                </td>
                <td className="px-3 py-3 sm:px-4">
                  {r.sessions.length === 0
                    ? "—"
                    : r.sessions.map((s) => (
                        <div key={s.id} className="whitespace-nowrap">
                          {new Date(s.checkInAt).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          –{" "}
                          {s.checkOutAt
                            ? new Date(s.checkOutAt).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : dict.session.open}
                        </div>
                      ))}
                </td>
                <td className="whitespace-nowrap px-3 py-3 sm:px-4">{formatMinutes(r.totalMinutes, lang)}</td>
                <td className="whitespace-pre-wrap px-3 py-3 sm:px-4">{r.tasks.map((t) => t.title).join(lang === "fa" ? "، " : "; ") || "—"}</td>
                <td className="whitespace-nowrap px-3 py-3 sm:px-4">
                  {(() => {
                    const st = dayRemoteStatus(r.sessions);
                    if (st === "remote") {
                      return (
                        <span className="inline-flex items-center gap-1">
                          <House size={12} className="text-primary-light" aria-hidden="true" />
                          {dict.report.remoteYes}
                        </span>
                      );
                    }
                    if (st === "hybrid") {
                      return (
                        <span className="inline-flex items-center gap-1">
                          <House size={12} className="text-primary-light" aria-hidden="true" />
                          {dict.report.remoteHybrid}
                        </span>
                      );
                    }
                    return dict.report.remoteNo;
                  })()}
                </td>
                <td className="px-3 py-3 sm:px-4">
                  {r.dayOff ? dict.leave.types[r.dayOff] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-card font-bold">
              <td className="px-3 py-3 sm:px-4">{dict.report.total}</td>
              <td className="px-3 py-3 sm:px-4">
                {dict.report.daysWorked}: {formatNumber(totals.daysWorked, lang)}
              </td>
              <td className="px-3 py-3 sm:px-4">{formatMinutes(totals.totalMinutes, lang)}</td>
              <td className="px-3 py-3 sm:px-4">{formatNumber(totals.taskCount, lang)}</td>
              <td className="px-3 py-3 sm:px-4">
                <span className="inline-flex items-center gap-1">
                  <House size={12} className="text-primary-light" aria-hidden="true" />
                  {formatNumber(totals.remoteDays, lang)}
                </span>
              </td>
              <td className="px-3 py-3 sm:px-4">{dict.report.offDays}: {formatNumber(totals.offDays, lang)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
