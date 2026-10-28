"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Clock3, FileDown, FileSpreadsheet, House, TableProperties } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { listDayOffs, listSessions, listTasks } from "@/lib/backend";
import { daysInMonth, formatMinutes, formatNumber } from "@/lib/dates";
import type { MonthDayRow } from "@/lib/types";
import { EXPORT_FIELDS, exportManyExcel, exportManyPdf, monthLabel, monthTotals } from "@/lib/report";
import { Button, Card, EmptyState } from "@/components/ui";
import { MonthReportTable } from "@/components/MonthReportTable";
import { ReportSummaryCards } from "@/components/ReportSummaryCards";
import type { ExportField } from "@/lib/report";
import { ExportFieldPicker } from "@/components/ExportFieldPicker";
import { formatJalaliMonth, jalaaliMonthLength, toGregorianKey, toJalaali } from "@/lib/jalali";

interface MonthInfo {
  month: number;
  rows: MonthDayRow[];
  totalMinutes: number;
  daysWorked: number;
  remoteDays: number;
  offDays: number;
  hasData: boolean;
}

function convertReportYear(year: number, from: "en" | "fa", to: "en" | "fa"): number {
  if (from === to) return year;
  // Mid-year keeps the selected annual reporting period aligned across calendars.
  if (to === "fa") return toJalaali(year, 7, 1).jy;
  return Number(toGregorianKey(year, 7, 1).slice(0, 4));
}

export default function ReportCenterPage() {
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const { dict, lang, dir } = useLang();
  const [yearContext, setYearContext] = useState<{ lang: "en" | "fa"; year: number }>(() => ({
    lang: "en",
    year: new Date().getFullYear(),
  }));
  const year = convertReportYear(yearContext.year, yearContext.lang, lang);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [fields, setFields] = useState<ExportField[]>(EXPORT_FIELDS);
  const [view, setView] = useState<"reports" | "export">("reports");
  const [infos, setInfos] = useState<MonthInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!authUser) return;
    let current = true;
    setLoaded(false);
    setLoadError(false);
    void (async () => {
      try {
        const from = lang === "fa" ? toGregorianKey(year, 1, 1) : `${year}-01-01`;
        const to = lang === "fa" ? toGregorianKey(year, 12, jalaaliMonthLength(year, 12)) : `${year}-12-31`;
        const [sessions, tasks, dayOffs] = await Promise.all([
          listSessions(authUser.id, from, to),
          listTasks(authUser.id, from, to),
          listDayOffs(authUser.id, from, to),
        ]);
        const list: MonthInfo[] = [];
        for (let m = 1; m <= 12; m++) {
          const dateKeys = lang === "fa"
            ? Array.from({ length: jalaaliMonthLength(year, m) }, (_, i) => toGregorianKey(year, m, i + 1))
            : daysInMonth(year, m);
          const rows = dateKeys.map((date) => {
            const ds = sessions.filter((s) => s.date === date);
            const dt = tasks.filter((t) => t.date === date);
            const totalMinutes = ds.reduce(
              (a, s) =>
                a + (s.checkOutAt ? Math.max(0, Math.round((new Date(s.checkOutAt).getTime() - new Date(s.checkInAt).getTime()) / 60000)) : 0),
              0,
            );
            return { date, sessions: ds, tasks: dt, totalMinutes, dayOff: dayOffs[date] };
          });
          const t = monthTotals(rows);
          list.push({
            month: m,
            rows,
            totalMinutes: t.totalMinutes,
            daysWorked: t.daysWorked,
            remoteDays: t.remoteDays,
            offDays: t.offDays,
            hasData: rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0 || r.dayOff),
          });
        }
        if (!current) return;
        setInfos(list);
        setLoaded(true);
      } catch {
        if (!current) return;
        setInfos([]);
        setLoadError(true);
        setLoaded(true);
      }
    })();
    return () => {
      current = false;
    };
  }, [authUser, year, lang, reloadToken]);

  const shiftYear = (delta: number) => {
    setYearContext({ lang, year: year + delta });
  };

  const toggle = (m: number) => setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const selectAll = () => setSelected(infos.filter((info) => info.hasData).map((info) => info.month));
  const openMonth = (m: number) => {
    setActiveMonth(m);
    setSelected([m]);
  };
  const getMonthLabel = (calendarYear: number, month: number) =>
    lang === "fa" ? formatJalaliMonth(calendarYear, month) : monthLabel(calendarYear, month, lang);

  const packs = useMemo(
    () =>
      infos
        .filter((i) => selected.includes(i.month))
        .sort((a, b) => a.month - b.month)
        .map((i) => ({ month: i.month, rows: i.rows })),
    [infos, selected],
  );
  const exportable = useMemo(() => packs.filter((p) => p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0 || r.dayOff)), [packs]);
  const yearTotals = useMemo(
    () => ({
      totalMinutes: infos.reduce((a, i) => a + i.totalMinutes, 0),
      daysWorked: infos.reduce((a, i) => a + i.daysWorked, 0),
      remoteDays: infos.reduce((a, i) => a + i.remoteDays, 0),
      offDays: infos.reduce((a, i) => a + i.offDays, 0),
    }),
    [infos],
  );
  const active = activeMonth !== null ? infos.find((i) => i.month === activeMonth) ?? null : null;
  const hasAnyData = infos.some((i) => i.hasData);

  if (loading || !user) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const doExcel = () => {
    if (!authUser || exportable.length === 0 || fields.length === 0) return;
    exportManyExcel({ displayName: authUser.displayName, email: authUser.email, year, lang, calendar: lang === "fa" ? "jalali" : "gregorian" }, packs, dict, fields);
  };
  const doPdf = () => {
    if (!authUser || exportable.length === 0 || fields.length === 0) return;
    exportManyPdf({ displayName: authUser.displayName, email: authUser.email, year, lang, calendar: lang === "fa" ? "jalali" : "gregorian" }, packs, dict, fields);
  };
  const exportButtons = (
    <div className="no-print flex flex-col gap-2 sm:flex-row">
      <Button variant="primary" className="w-full sm:w-auto" disabled={exportable.length === 0 || fields.length === 0} onClick={doPdf}>
        <FileDown size={16} aria-hidden="true" /> {dict.report.exportPdf}
      </Button>
      <Button variant="secondary" className="w-full sm:w-auto" disabled={exportable.length === 0 || fields.length === 0} onClick={doExcel}>
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
            <h1 className="text-xl font-bold">{getMonthLabel(year, activeMonth)}</h1>
          </div>
          <Link href={`/report/${year}/${mm}`} className="text-sm font-semibold text-primary-light hover:underline">
            {dict.report.openFullPage}
          </Link>
        </div>

        <ReportSummaryCards
          totalMinutes={active.totalMinutes}
          daysWorked={active.daysWorked}
          remoteDays={active.remoteDays}
          offDays={active.offDays}
          lang={lang}
          dict={dict}
        />

        <Card className="no-print border-primary/15 bg-primary/[0.035]">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-light">
              <FileDown size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-bold">{dict.report.exportTitle}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{dict.report.exportHint}</p>
            </div>
          </div>
          <ExportFieldPicker value={fields} onChange={setFields} dict={dict} lang={lang} />
          <div className="mt-4">{exportButtons}</div>
          <p className="mt-2 text-xs text-muted-foreground">{dict.report.printHint}</p>
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

  // ----- year view: separate report browsing from export configuration -----
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{dict.report.title}</h1>
        <div className="glass inline-flex items-center gap-1 rounded-xl p-1">
          <button className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-pine" onClick={() => shiftYear(-1)} aria-label={dict.report.prev}>
            {dir === "rtl" ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
          </button>
          <span className="min-w-16 text-center text-sm font-bold">{formatNumber(year, lang)}</span>
          <button className="cursor-pointer rounded-lg p-2 transition-colors hover:bg-pine" onClick={() => shiftYear(1)} aria-label={dict.report.next}>
            {dir === "rtl" ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1" role="group" aria-label={dict.report.title}>
        <button
          type="button"
          aria-pressed={view === "reports"}
          onClick={() => setView("reports")}
          className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${view === "reports" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <TableProperties size={16} aria-hidden="true" />
          <span className="truncate">{dict.report.browseReports}</span>
        </button>
        <button
          type="button"
          aria-pressed={view === "export"}
          onClick={() => setView("export")}
          className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors ${view === "export" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          <FileDown size={16} aria-hidden="true" />
          <span className="truncate">{dict.report.buildExport}</span>
        </button>
      </div>

      {!loaded ? (
        <Card><p className="text-sm text-muted-foreground">{dict.common.loading}</p></Card>
      ) : loadError ? (
        <Card className="flex flex-col items-start gap-3 border-destructive/20 sm:flex-row sm:items-center sm:justify-between">
          <p role="alert" className="text-sm text-muted-foreground">{dict.common.offline}</p>
          <Button variant="secondary" onClick={() => setReloadToken((token) => token + 1)}>
            {dict.common.retry}
          </Button>
        </Card>
      ) : view === "reports" ? (
        <div className="space-y-4">
          <ReportSummaryCards
            totalMinutes={yearTotals.totalMinutes}
            daysWorked={yearTotals.daysWorked}
            remoteDays={yearTotals.remoteDays}
            offDays={yearTotals.offDays}
            lang={lang}
            dict={dict}
          />
          <p className="text-sm text-muted-foreground">{dict.report.browseHint}</p>

          {!hasAnyData ? <Card><EmptyState message={dict.report.noData} /></Card> : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {infos.map((info) => (
              <button
                key={info.month}
                type="button"
                onClick={() => openMonth(info.month)}
                className={`group relative flex min-w-0 cursor-pointer flex-col gap-4 overflow-hidden rounded-2xl border p-4 text-start transition-all hover:-translate-y-0.5 hover:border-primary-light hover:bg-pine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-light focus-visible:ring-offset-2 focus-visible:ring-offset-background ${info.hasData ? "border-border bg-card/80" : "border-border/60 bg-card/40 text-muted-foreground"}`}
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${info.hasData ? "bg-primary-light/80" : "bg-muted-foreground/20"}`} aria-hidden="true" />
                <span className="flex w-full min-w-0 items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${info.hasData ? "bg-primary/10 text-primary-light" : "bg-muted text-muted-foreground"}`}>
                      <CalendarDays size={19} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-foreground">{getMonthLabel(year, info.month)}</span>
                      {!info.hasData ? <span className="mt-0.5 block text-xs text-muted-foreground">{dict.report.noDataMonth}</span> : null}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
                {info.hasData ? (
                  <span className="grid w-full grid-cols-2 gap-2">
                    <span className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2">
                      <Clock3 size={14} className="shrink-0 text-primary-light" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-medium text-muted-foreground">{dict.report.totalHours}</span>
                        <span className="block truncate text-sm font-bold tabular-nums text-foreground">{formatMinutes(info.totalMinutes, lang)}</span>
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2">
                      <CalendarDays size={14} className="shrink-0 text-accent-dark dark:text-accent-light" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-medium text-muted-foreground">{dict.report.daysWorked}</span>
                        <span className="block truncate text-sm font-bold tabular-nums text-foreground">{formatNumber(info.daysWorked, lang)}</span>
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2">
                      <House size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-medium text-muted-foreground">{dict.report.remoteDays}</span>
                        <span className="block truncate text-sm font-bold tabular-nums text-foreground">{formatNumber(info.remoteDays, lang)}</span>
                      </span>
                    </span>
                    <span className="flex min-w-0 items-center gap-2 rounded-xl border border-border/70 bg-background/55 px-2.5 py-2">
                      <CalendarOff size={14} className="shrink-0 text-amber-600 dark:text-amber-300" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[10px] font-medium text-muted-foreground">{dict.report.offDays}</span>
                        <span className="block truncate text-sm font-bold tabular-nums text-foreground">{formatNumber(info.offDays, lang)}</span>
                      </span>
                    </span>
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <Card className="space-y-5 border-primary/15 bg-primary/[0.025]">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary-light">
              <FileDown size={19} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-bold">{dict.report.exportTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{dict.report.exportHint}</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="min-w-0">
              <h3 className="mb-3 text-sm font-bold">{dict.report.exportStepMonths}</h3>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                <button className="cursor-pointer font-semibold text-primary-light hover:underline" onClick={selectAll}>
                  {dict.report.exportSelectAll} ({dict.report.exportWholeYear})
                </button>
                <button className="cursor-pointer font-semibold text-primary-light hover:underline" onClick={() => setSelected([])}>
                  {dict.report.exportClear}
                </button>
                <span className="text-muted-foreground">{dict.report.exportSelected.replace("{n}", formatNumber(selected.length, lang))}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {infos.map((info) => (
                  <label
                    key={info.month}
                    className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-sm transition-colors ${selected.includes(info.month) ? "border-primary-light bg-pine" : "border-border bg-card/70 hover:bg-pine"} ${info.hasData ? "" : "opacity-60"}`}
                  >
                    <input type="checkbox" checked={selected.includes(info.month)} onChange={() => toggle(info.month)} disabled={!info.hasData} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{getMonthLabel(year, info.month)}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {info.hasData ? `${formatMinutes(info.totalMinutes, lang)} · ${formatNumber(info.daysWorked, lang)} · ${formatNumber(info.offDays, lang)} ${dict.report.offDays}` : dict.report.noDataMonth}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </section>

            <section className="min-w-0 border-t border-border pt-5 lg:border-t-0 lg:border-s lg:pt-0 lg:ps-5">
              <h3 className="mb-3 text-sm font-bold">{dict.report.exportStepFields}</h3>
              <ExportFieldPicker value={fields} onChange={setFields} dict={dict} lang={lang} />
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-3 text-xs text-muted-foreground">{dict.report.printHint}</p>
                {exportButtons}
              </div>
            </section>
          </div>
        </Card>
      )}
    </div>
  );
}
