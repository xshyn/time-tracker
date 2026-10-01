"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { listSessions, listTasks } from "@/lib/backend";
import { daysInMonth, formatMinutes } from "@/lib/dates";
import { formatJalaliLong } from "@/lib/jalali";
import type { MonthDayRow } from "@/lib/types";
import { exportExcel, exportPdf, dayRemoteStatus, monthTotals } from "@/lib/report";
import { Button, Card, EmptyState } from "@/components/ui";

export default function ReportPage() {
  const params = useParams<{ year: string; month: string }>();
  const year = Number(params.year);
  const month = Number(params.month);
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const { dict, lang } = useLang();
  const router = useRouter();
  const [rows, setRows] = useState<MonthDayRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!authUser) return;
    const keys = daysInMonth(year, month);
    const [sessions, tasks] = await Promise.all([
      listSessions(authUser.id, keys[0], keys[keys.length - 1]),
      listTasks(authUser.id, keys[0], keys[keys.length - 1]),
    ]);
    setRows(
      keys.map((date) => {
        const ds = sessions.filter((s) => s.date === date);
        const dt = tasks.filter((t) => t.date === date);
        const totalMinutes = ds.reduce(
          (a, s) => a + (s.checkOutAt ? Math.max(0, Math.round((new Date(s.checkOutAt).getTime() - new Date(s.checkInAt).getTime()) / 60000)) : 0),
          0,
        );
        return { date, sessions: ds, tasks: dt, totalMinutes };
      }),
    );
    setLoaded(true);
  }, [authUser, year, month]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const totals = useMemo(() => monthTotals(rows), [rows]);

  if (loading || !user) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    router.push(`/report/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
    year: "numeric",
    month: "long",
  });

  const hasData = rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          {dict.report.title} · {monthLabel}
        </h1>
        <div className="flex items-center gap-2">
          <button className="cursor-pointer rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border" onClick={() => shift(-1)}>
            {dict.report.prev}
          </button>
          <button className="cursor-pointer rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border" onClick={() => shift(1)}>
            {dict.report.next}
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            {dict.report.totalHours}: <strong>{formatMinutes(totals.totalMinutes)}</strong>
          </span>
          <span>
            {dict.report.daysWorked}: <strong>{totals.daysWorked}</strong>
          </span>
          <span>
            🏠 {dict.report.remoteDays}: <strong>{totals.remoteDays}</strong>
          </span>
        </div>
        <div className="no-print mt-3 flex flex-wrap gap-2">
          <Button
            variant="primary"
            disabled={!hasData}
            onClick={() =>
              authUser &&
              exportPdf(
                { displayName: authUser.displayName, email: authUser.email, year, month, lang },
                rows,
                dict,
              )
            }
          >
            <FileDown size={16} aria-hidden="true" /> {dict.report.exportPdf}
          </Button>
          <Button
            variant="secondary"
            disabled={!hasData}
            onClick={() =>
              authUser &&
              exportExcel(
                { displayName: authUser.displayName, email: authUser.email, year, month, lang },
                rows,
                dict,
              )
            }
          >
            <FileSpreadsheet size={16} aria-hidden="true" /> {dict.report.exportExcel}
          </Button>
        </div>
        <p className="no-print mt-2 text-xs text-muted-foreground">{dict.report.printHint}</p>
      </Card>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
      ) : !hasData ? (
        <Card>
          <EmptyState message={dict.report.noData} />
        </Card>
      ) : (
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
      )}
    </div>
  );
}
