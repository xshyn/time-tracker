"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, FileDown, FileSpreadsheet } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { listSessions, listTasks } from "@/lib/backend";
import { daysInMonth, formatMinutes } from "@/lib/dates";
import type { MonthDayRow } from "@/lib/types";
import { exportManyExcel, exportManyPdf, monthLabel, monthTotals } from "@/lib/report";
import { Button, Card, EmptyState } from "@/components/ui";
import { MonthReportTable } from "@/components/MonthReportTable";

interface MonthInfo {
  month: number;
  rows: MonthDayRow[];
  totalMinutes: number;
  daysWorked: number;
  remoteDays: number;
  hasData: boolean;
}

export default function ReportCenterPage() {
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const { dict, lang, dir } = useLang();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [infos, setInfos] = useState<MonthInfo[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    setLoaded(false);
    void (async () => {
      const [sessions, tasks] = await Promise.all([
        listSessions(authUser.id, `${year}-01-01`, `${year}-12-31`),
        listTasks(authUser.id, `${year}-01-01`, `${year}-12-31`),
      ]);
      const list: MonthInfo[] = [];
      for (let m = 1; m <= 12; m++) {
        const rows = daysInMonth(year, m).map((date) => {
          const ds = sessions.filter((s) => s.date === date);
          const dt = tasks.filter((t) => t.date === date);
          const totalMinutes = ds.reduce(
            (a, s) =>
              a + (s.checkOutAt ? Math.max(0, Math.round((new Date(s.checkOutAt).getTime() - new Date(s.checkInAt).getTime()) / 60000)) : 0),
            0,
          );
          return { date, sessions: ds, tasks: dt, totalMinutes };
        });
        const t = monthTotals(rows);
        list.push({
          month: m,
          rows,
          totalMinutes: t.totalMinutes,
          daysWorked: t.daysWorked,
          remoteDays: t.remoteDays,
          hasData: rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0),
        });
      }
      setInfos(list);
      setLoaded(true);
    })();
  }, [authUser, year]);

  const toggle = (m: number) => setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const selectAll = () => setSelected(Array.from({ length: 12 }, (_, i) => i + 1));
  const openMonth = (m: number) => {
    setActiveMonth(m);
    setSelected([m]);
  };

  const packs = useMemo(
    () =>
      infos
        .filter((i) => selected.includes(i.month))
        .sort((a, b) => a.month - b.month)
        .map((i) => ({ month: i.month, rows: i.rows })),
    [infos, selected],
  );
  const exportable = useMemo(() => packs.filter((p) => p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0)), [packs]);
  const yearTotals = useMemo(
    () => ({
      totalMinutes: infos.reduce((a, i) => a + i.totalMinutes, 0),
      daysWorked: infos.reduce((a, i) => a + i.daysWorked, 0),
      remoteDays: infos.reduce((a, i) => a + i.remoteDays, 0),
    }),
    [infos],
  );
  const active = activeMonth !== null ? infos.find((i) => i.month === activeMonth) ?? null : null;
  const hasAnyData = infos.some((i) => i.hasData);

  if (loading || !user) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const doExcel = () => {
    if (!authUser || exportable.length === 0) return;
    exportManyExcel({ displayName: authUser.displayName, email: authUser.email, year, lang }, packs, dict);
  };
  const doPdf = () => {
    if (!authUser || exportable.length === 0) return;
    exportManyPdf({ displayName: authUser.displayName, email: authUser.email, year, lang }, packs, dict);
  };
  const exportButtons = (
    <div className="no-print mt-3 flex flex-wrap gap-2">
      <Button variant="primary" disabled={exportable.length === 0} onClick={doPdf}>
        <FileDown size={16} aria-hidden="true" /> {dict.report.exportPdf}
      </Button>
      <Button variant="secondary" disabled={exportable.length === 0} onClick={doExcel}>
        <FileSpreadsheet size={16} aria-hidden="true" /> {dict.report.exportExcel}
      </Button>
    </div>
  );

  // ----- month view: report for the selected month -----
  if (activeMonth !== null && active) {
    const mm = String(activeMonth).padStart(2, "0");
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border"
              onClick={() => setActiveMonth(null)}
            >
              {dir === "rtl" ? <ChevronLeft size={16} aria-hidden="true" className="rotate-180" /> : <ChevronLeft size={16} aria-hidden="true" />}
              {dict.report.allMonths}
            </button>
            <h1 className="text-xl font-bold">{monthLabel(year, activeMonth, lang)}</h1>
          </div>
          <Link href={`/report/${year}/${mm}`} className="text-sm font-semibold text-primary-light hover:underline">
            {dict.report.openFullPage}
          </Link>
        </div>

        <Card>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              {dict.report.totalHours}: <strong>{formatMinutes(active.totalMinutes)}</strong>
            </span>
            <span>
              {dict.report.daysWorked}: <strong>{active.daysWorked}</strong>
            </span>
            <span>
              🏠 {dict.report.remoteDays}: <strong>{active.remoteDays}</strong>
            </span>
          </div>
          {exportButtons}
          <p className="no-print mt-2 text-xs text-muted-foreground">{dict.report.printHint}</p>
        </Card>

        {!loaded ? (
          <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
        ) : !active.hasData ? (
          <Card>
            <EmptyState message={dict.report.noData} />
          </Card>
        ) : (
          <MonthReportTable rows={active.rows} lang={lang} dict={dict} />
        )}
      </div>
    );
  }

  // ----- year view: 12-month calendar grid -----
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">{dict.report.title}</h1>
        <div className="flex items-center gap-2">
          <button className="cursor-pointer rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border" onClick={() => setYear((y) => y - 1)} aria-label={dict.report.prev}>
            {dict.report.prev}
          </button>
          <span className="min-w-16 text-center text-sm font-bold">{year}</span>
          <button className="cursor-pointer rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border" onClick={() => setYear((y) => y + 1)} aria-label={dict.report.next}>
            {dict.report.next}
          </button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            {dict.report.totalHours}: <strong>{formatMinutes(yearTotals.totalMinutes)}</strong>
          </span>
          <span>
            {dict.report.daysWorked}: <strong>{yearTotals.daysWorked}</strong>
          </span>
          <span>
            🏠 {dict.report.remoteDays}: <strong>{yearTotals.remoteDays}</strong>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
          <button className="cursor-pointer font-semibold text-primary-light hover:underline" onClick={selectAll}>
            {dict.report.exportSelectAll} ({dict.report.exportWholeYear})
          </button>
          <button className="cursor-pointer font-semibold text-primary-light hover:underline" onClick={() => setSelected([])}>
            {dict.report.exportClear}
          </button>
          <span className="text-muted-foreground">{dict.report.exportSelected.replace("{n}", String(selected.length))}</span>
        </div>
        {exportButtons}
        <p className="no-print mt-2 text-xs text-muted-foreground">{dict.report.pickMonth}</p>
      </Card>

      {!loaded ? (
        <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
      ) : !hasAnyData ? (
        <Card>
          <EmptyState message={dict.report.noData} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {infos.map((info) => (
            <div
              key={info.month}
              className={`rounded-2xl border p-3 backdrop-blur-md transition-colors ${
                selected.includes(info.month) ? "border-primary-light bg-pine" : "border-border bg-card/70"
              } ${info.hasData ? "" : "opacity-60"}`}
            >
              <button className="block w-full cursor-pointer text-start" onClick={() => openMonth(info.month)} aria-label={monthLabel(year, info.month, lang)}>
                <span className="block truncate font-bold">{monthLabel(year, info.month, lang)}</span>
                <span className="mt-1 block text-sm">
                  {info.hasData ? (
                    <>
                      <strong>{formatMinutes(info.totalMinutes)}</strong> <span className="text-muted-foreground">· {info.daysWorked} {dict.report.daysWorked}</span>
                      {info.remoteDays > 0 ? <span className="ms-1">🏠{info.remoteDays}</span> : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground">{dict.report.noDataMonth}</span>
                  )}
                </span>
              </button>
              <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <input type="checkbox" checked={selected.includes(info.month)} onChange={() => toggle(info.month)} disabled={!info.hasData} />
                {dict.report.exportMonths}
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
