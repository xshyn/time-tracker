"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { FileDown, FileSpreadsheet, X } from "lucide-react";
import { listSessions, listTasks } from "@/lib/backend";
import { daysInMonth, formatMinutes, formatNumber } from "@/lib/dates";
import type { MonthDayRow } from "@/lib/types";
import { calendarMonthLabel, EXPORT_FIELDS, exportManyExcel, exportManyPdf, monthTotals } from "@/lib/report";
import type { ExportField } from "@/lib/report";
import { jalaaliMonthLength, toGregorianKey, toJalaali } from "@/lib/jalali";
import type { Dict } from "@/lib/i18n/en";
import { ExportFieldPicker } from "./ExportFieldPicker";
import { Button } from "./ui";

interface MonthInfo {
  month: number;
  rows: MonthDayRow[];
  totalMinutes: number;
  daysWorked: number;
  hasData: boolean;
}

export function ExportModal({
  open,
  onClose,
  userId,
  displayName,
  email,
  initialYear,
  initialMonth,
  initialCalendar = "gregorian",
  lang,
  dict,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  email: string;
  initialYear: number;
  initialMonth: number;
  initialCalendar?: "gregorian" | "jalali";
  lang: "en" | "fa";
  dict: Dict;
}) {
  const [year, setYear] = useState(initialYear);
  const [selected, setSelected] = useState<number[]>([initialMonth]);
  const [fields, setFields] = useState<ExportField[]>(EXPORT_FIELDS);
  const [infos, setInfos] = useState<MonthInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal target: render at document.body so no ancestor filter/transform
  // (e.g. glass backdrop-filter panels) can re-anchor the fixed overlay.
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset to the current context each time the modal opens.
  useEffect(() => {
    if (open) {
      const initialJalali = lang === "fa" && initialCalendar === "gregorian" ? toJalaali(initialYear, initialMonth, 15) : null;
      setYear(initialJalali?.jy ?? initialYear);
      setSelected([initialJalali?.jm ?? initialMonth]);
      setFields(EXPORT_FIELDS);
    }
  }, [open, initialYear, initialMonth, initialCalendar, lang]);

  // Close on Escape + lock background scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Load one year of data once, then slice per month locally.
  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    void (async () => {
      const from = lang === "fa" ? toGregorianKey(year, 1, 1) : `${year}-01-01`;
      const to = lang === "fa" ? toGregorianKey(year, 12, jalaaliMonthLength(year, 12)) : `${year}-12-31`;
      const [sessions, tasks] = await Promise.all([
        listSessions(userId, from, to),
        listTasks(userId, from, to),
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
          return { date, sessions: ds, tasks: dt, totalMinutes };
        });
        const t = monthTotals(rows);
        list.push({ month: m, rows, totalMinutes: t.totalMinutes, daysWorked: t.daysWorked, hasData: rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0) });
      }
      setInfos(list);
      setLoaded(true);
    })();
  }, [open, userId, year, lang]);

  const toggle = (m: number) => setSelected((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  const selectAll = () => setSelected(Array.from({ length: 12 }, (_, i) => i + 1));

  const packs = useMemo(
    () =>
      infos
        .filter((i) => selected.includes(i.month))
        .sort((a, b) => a.month - b.month)
        .map((i) => ({ month: i.month, rows: i.rows })),
    [infos, selected],
  );
  const exportable = useMemo(() => packs.filter((p) => p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0)), [packs]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={dict.report.exportTitle}
      onClick={onClose}
    >
      {/* min-h-full centering: on short viewports the dialog scrolls inside
          the overlay instead of rendering out of the window. */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="glass max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl p-4 sm:p-5"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{dict.report.exportTitle}</h2>
            <button className="cursor-pointer rounded-lg p-1.5 hover:bg-pine" onClick={onClose} aria-label={dict.common.close}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{dict.report.exportYear}</span>
            <div className="flex items-center gap-2">
              <button className="cursor-pointer rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border" onClick={() => setYear((y) => y - 1)} aria-label={dict.report.prev}>
                {dict.report.prev}
              </button>
              <span className="min-w-16 text-center text-sm font-bold">{formatNumber(year, lang)}</span>
              <button className="cursor-pointer rounded-lg bg-muted px-3 py-1.5 text-sm font-semibold hover:bg-border" onClick={() => setYear((y) => y + 1)} aria-label={dict.report.next}>
                {dict.report.next}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <ExportFieldPicker value={fields} onChange={setFields} dict={dict} />
          </div>

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">{dict.report.exportMonths}</span>
            <div className="flex gap-2 text-xs">
              <button className="cursor-pointer font-semibold text-primary-light hover:underline" onClick={selectAll}>
                {dict.report.exportSelectAll} ({dict.report.exportWholeYear})
              </button>
              <button className="cursor-pointer font-semibold text-primary-light hover:underline" onClick={() => setSelected([])}>
                {dict.report.exportClear}
              </button>
            </div>
          </div>

          {!loaded ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{dict.common.loading}</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {infos.map((info) => (
                <label
                  key={info.month}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm transition-colors ${
                    selected.includes(info.month) ? "border-primary-light bg-pine" : "border-border bg-card/70 hover:bg-pine"
                  } ${info.hasData ? "" : "opacity-60"}`}
                >
                  <input type="checkbox" checked={selected.includes(info.month)} onChange={() => toggle(info.month)} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{calendarMonthLabel(year, info.month, lang)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {info.hasData ? `${formatMinutes(info.totalMinutes, lang)} · ${formatNumber(info.daysWorked, lang)}` : dict.report.noDataMonth}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <p className="mt-2 text-xs text-muted-foreground">{dict.report.exportSelected.replace("{n}", formatNumber(selected.length, lang))}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={exportable.length === 0}
              onClick={() => {
                exportManyPdf({ displayName, email, year, lang, calendar: lang === "fa" ? "jalali" : "gregorian" }, packs, dict, fields);
                onClose();
              }}
            >
              <FileDown size={16} aria-hidden="true" /> {dict.report.exportPdf}
            </Button>
            <Button
              variant="secondary"
              disabled={exportable.length === 0}
              onClick={() => {
                exportManyExcel({ displayName, email, year, lang, calendar: lang === "fa" ? "jalali" : "gregorian" }, packs, dict, fields);
                onClose();
              }}
            >
              <FileSpreadsheet size={16} aria-hidden="true" /> {dict.report.exportExcel}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              {dict.session.cancel}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{dict.report.printHint}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
