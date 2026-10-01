"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { listSessions, listTasks } from "@/lib/backend";
import { daysInMonth, formatMinutes } from "@/lib/dates";
import type { MonthDayRow } from "@/lib/types";
import { monthTotals } from "@/lib/report";
import { Button, Card, EmptyState } from "@/components/ui";
import { MonthReportTable } from "@/components/MonthReportTable";

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
          <Button variant="primary" disabled={!hasData} onClick={() => router.push("/report")}>
            <FileDown size={16} aria-hidden="true" /> {dict.report.exportOpen}
          </Button>
        </div>
      </Card>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
      ) : !hasData ? (
        <Card>
          <EmptyState message={dict.report.noData} />
        </Card>
      ) : (
        <MonthReportTable rows={rows} lang={lang} dict={dict} />
      )}
    </div>
  );
}
