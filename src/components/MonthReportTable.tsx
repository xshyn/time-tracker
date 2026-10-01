"use client";

import Link from "next/link";
import { formatMinutes } from "@/lib/dates";
import { formatJalaliLong } from "@/lib/jalali";
import type { MonthDayRow } from "@/lib/types";
import { dayRemoteStatus, monthTotals } from "@/lib/report";
import type { Dict } from "@/lib/i18n/en";
import { Card } from "./ui";

/** Shared monthly report table (day rows + totals footer), used by the month page and the report center. */
export function MonthReportTable({ rows, lang, dict }: { rows: MonthDayRow[]; lang: "en" | "fa"; dict: Dict }) {
  const totals = monthTotals(rows);
  return (
    <Card className="overflow-x-auto p-0 sm:p-0">
      <table className="w-full min-w-[46rem] border-collapse text-sm">
        <thead>
          <tr className="bg-card text-start">
            <th className="border-b border-border p-2 text-start">{dict.report.date}</th>
            <th className="border-b border-border p-2 text-start">{dict.report.sessionsCol}</th>
            <th className="border-b border-border p-2 text-start">{dict.report.hoursCol}</th>
            <th className="border-b border-border p-2 text-start">{dict.report.tasksCol}</th>
            <th className="border-b border-border p-2 text-start">🏠 {dict.report.remoteCol}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date} className="border-b border-muted align-top last:border-0">
              <td className="whitespace-nowrap p-2">
                <Link href={`/day/${r.date}`} className="text-primary-light hover:underline">
                  {lang === "fa" ? formatJalaliLong(r.date) : r.date}
                </Link>
                {lang === "fa" ? <div className="text-[11px] text-muted-foreground">{r.date}</div> : null}
              </td>
              <td className="p-2">
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
              <td className="whitespace-nowrap p-2">{formatMinutes(r.totalMinutes)}</td>
              <td className="p-2 whitespace-pre-wrap">{r.tasks.map((t) => t.title).join(lang === "fa" ? "، " : "; ") || "—"}</td>
              <td className="whitespace-nowrap p-2">
                {(() => {
                  const st = dayRemoteStatus(r.sessions);
                  if (st === "remote") return `🏠 ${dict.report.remoteYes}`;
                  if (st === "hybrid") return `🏠 ${dict.report.remoteHybrid}`;
                  return dict.report.remoteNo;
                })()}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-card font-bold">
            <td className="p-2">{dict.report.total}</td>
            <td className="p-2">
              {dict.report.daysWorked}: {totals.daysWorked}
            </td>
            <td className="p-2">{formatMinutes(totals.totalMinutes)}</td>
            <td className="p-2">🏠 {totals.remoteDays}</td>
            <td className="p-2" />
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
