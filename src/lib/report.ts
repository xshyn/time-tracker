import * as XLSX from "xlsx";
import { formatMinutes, formatNumber } from "./dates";
import { formatJalaliLong, formatJalaliMonth, toJalaaliKey } from "./jalali";
import type { MonthDayRow } from "./types";
import type { Dict } from "./i18n/en";

export interface ReportMeta {
  displayName: string;
  email: string;
  year: number;
  month: number; // 1-12
  lang: "en" | "fa";
  calendar?: "gregorian" | "jalali";
}

/** Base identity for multi-month / whole-year exports. */
export interface YearMeta {
  displayName: string;
  email: string;
  year: number;
  lang: "en" | "fa";
  calendar?: "gregorian" | "jalali";
}

export interface MonthPack {
  month: number; // 1-12
  rows: MonthDayRow[];
}

export type ExportField = "date" | "sessions" | "hours" | "tasks" | "remote" | "leave";

export const EXPORT_FIELDS: ExportField[] = ["date", "sessions", "hours", "tasks", "remote", "leave"];

/** Keep output columns in the report's stable display order and ignore duplicates. */
function normalizeExportFields(fields: ExportField[]): ExportField[] {
  return EXPORT_FIELDS.filter((field) => fields.includes(field));
}

export function monthTotals(rows: MonthDayRow[]): { totalMinutes: number; daysWorked: number; remoteDays: number; taskCount: number; offDays: number } {
  const totalMinutes = rows.reduce((a, r) => a + r.totalMinutes, 0);
  const daysWorked = rows.filter((r) => r.totalMinutes > 0 || r.tasks.length > 0).length;
  const remoteDays = rows.filter((r) => r.sessions.length > 0 && r.sessions.every((s) => s.isRemote)).length;
  const taskCount = rows.reduce((total, row) => total + row.tasks.length, 0);
  const offDays = rows.filter((row) => row.dayOff).length;
  return { totalMinutes, daysWorked, remoteDays, taskCount, offDays };
}

export type DayRemoteStatus = "none" | "onsite" | "remote" | "hybrid";

export function dayRemoteStatus(sessions: MonthDayRow["sessions"]): DayRemoteStatus {
  if (sessions.length === 0) return "none";
  const remote = sessions.filter((s) => s.isRemote).length;
  if (remote === 0) return "onsite";
  if (remote === sessions.length) return "remote";
  return "hybrid";
}

function remoteCell(sessions: MonthDayRow["sessions"], dict: Dict): string {
  const st = dayRemoteStatus(sessions);
  if (st === "remote") return dict.report.remoteYes;
  if (st === "hybrid") return dict.report.remoteHybrid;
  if (st === "onsite") return dict.report.remoteNo;
  return dict.report.remoteNo;
}

function sessionCell(sessions: MonthDayRow["sessions"], lang: string): string {
  if (sessions.length === 0) return lang === "fa" ? "—" : "—";
  return sessions
    .map((s) => {
      const ci = new Date(s.checkInAt).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const co = s.checkOutAt
        ? new Date(s.checkOutAt).toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : lang === "fa" ? "باز" : "open";
      return `${ci} – ${co}`;
    })
    .join(lang === "fa" ? "، " : "; ");
}

function tasksCell(tasks: MonthDayRow["tasks"]): string {
  const singleLine = (value: string) => value.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").trim();
  const wrap = (value: string, maxLength = 36) => {
    const words = value.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && candidate.length > maxLength) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines.join("\n");
  };
  return tasks
    .map((t) => wrap(t.description ? `${singleLine(t.title)}: ${singleLine(t.description)}` : singleLine(t.title)))
    .join("\n");
}

export function monthLabel(year: number, month: number, lang: string): string {
  return new Date(year, month - 1, 1).toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
    year: "numeric",
    month: "long",
  });
}

/** Shared single-month sheet content: title, header, body (incl. totals row). */
function exportDate(dateKey: string, lang: string): string {
  return lang === "fa" ? formatJalaliLong(dateKey) : dateKey;
}

export function calendarMonthLabel(year: number, month: number, lang: string): string {
  if (lang === "fa") return formatJalaliMonth(year, month);
  return monthLabel(year, month, lang);
}

function exportMonthLabel(year: number, month: number, lang: string, calendar: "gregorian" | "jalali" = "gregorian"): string {
  if (lang === "fa" && calendar === "jalali") return formatJalaliMonth(year, month);
  if (lang === "fa") {
    const date = toJalaaliKey(`${year}-${String(month).padStart(2, "0")}-15`);
    return formatJalaliMonth(date.jy, date.jm);
  }
  return monthLabel(year, month, lang);
}

function monthSheetContent(
  meta: ReportMeta,
  rows: MonthDayRow[],
  dict: Dict,
  fields: ExportField[],
): { title: string; header: string[]; body: string[][] } {
  const { totalMinutes, daysWorked, remoteDays, taskCount, offDays } = monthTotals(rows);
  const columns: Record<ExportField, { label: string; value: (row: MonthDayRow) => string }> = {
    date: { label: dict.report.date, value: (row) => exportDate(row.date, meta.lang) },
    sessions: { label: dict.report.sessionsCol, value: (row) => sessionCell(row.sessions, meta.lang) },
    hours: { label: dict.report.hoursCol, value: (row) => formatMinutes(row.totalMinutes, meta.lang) },
    tasks: { label: dict.report.tasksCol, value: (row) => tasksCell(row.tasks) },
    remote: { label: dict.report.remoteCol, value: (row) => remoteCell(row.sessions, dict) },
    leave: { label: dict.report.leaveCol, value: (row) => row.dayOff ? dict.leave.types[row.dayOff] : "—" },
  };
  const chosen = normalizeExportFields(fields);
  const header = chosen.map((field) => columns[field].label);
  const body = rows.map((row) => chosen.map((field) => columns[field].value(row)));
  body.push(
    chosen.map((field) => {
      if (field === "date") return dict.report.total;
      if (field === "sessions") return `${dict.report.daysWorked}: ${formatNumber(daysWorked, meta.lang)}`;
      if (field === "hours") return formatMinutes(totalMinutes, meta.lang);
      if (field === "tasks") return formatNumber(taskCount, meta.lang);
      if (field === "remote") return `${dict.report.remoteDays}: ${formatNumber(remoteDays, meta.lang)}`;
      if (field === "leave") return `${dict.report.offDays}: ${formatNumber(offDays, meta.lang)}`;
      return "";
    }),
  );
  return { title: `${dict.report.title} — ${exportMonthLabel(meta.year, meta.month, meta.lang, meta.calendar)}`, header, body };
}

function applySheetView(ws: XLSX.WorkSheet, lang: string): void {
  // RTL sheet view for Persian so Excel opens right-to-left
  if (lang === "fa") {
    (ws as Record<string, unknown>)["!views"] = [{ rightToLeft: true }];
  }
}

function addWorkbookLayout(
  ws: XLSX.WorkSheet,
  fields: ExportField[],
  headerRow: number,
  dataRowCount: number,
  dataRowHeights?: number[],
): void {
  const width = Math.max(fields.length, 1);
  const layout = ws as unknown as Record<string, unknown>;
  layout["!merges"] = [0, 1, 2].map((row) => ({ s: { r: row, c: 0 }, e: { r: row, c: width - 1 } }));
  layout["!rows"] = [
    { hpt: 30 },
    { hpt: 20 },
    { hpt: 24 },
    { hpt: 8 },
    { hpt: 24 },
    ...Array.from({ length: dataRowCount }, (_, index) => ({ hpt: dataRowHeights?.[index] ?? 22 })),
    { hpt: 26 },
  ];
  if (dataRowCount > 0) {
    const lastRow = headerRow + dataRowCount;
    layout["!autofilter"] = { ref: `A${headerRow + 1}:${XLSX.utils.encode_col(width - 1)}${lastRow}` };
  }
  layout["!outline"] = { above: false, left: false };
}

function workbookIntro(title: string, subtitle: string, summary: string): string[][] {
  return [[title], [subtitle], [summary], []];
}

function workbookSummary(fields: ExportField[], totals: ReturnType<typeof monthTotals>, dict: Dict, lang: string): string {
  const values: Partial<Record<ExportField, string>> = {
    sessions: `${dict.report.daysWorked}: ${formatNumber(totals.daysWorked, lang)}`,
    hours: `${dict.report.totalHours}: ${formatMinutes(totals.totalMinutes, lang)}`,
    tasks: `${dict.report.tasksCol}: ${formatNumber(totals.taskCount, lang)}`,
    remote: `${dict.report.remoteDays}: ${formatNumber(totals.remoteDays, lang)}`,
    leave: `${dict.report.offDays}: ${formatNumber(totals.offDays, lang)}`,
  };
  return fields.map((field) => values[field]).filter(Boolean).join("   ·   ");
}

function exportMetricEntries(
  fields: ExportField[],
  totals: ReturnType<typeof monthTotals>,
  dict: Dict,
  lang: string,
): Array<[string, string]> {
  const values: Partial<Record<ExportField, [string, string]>> = {
    sessions: [dict.report.daysWorked, formatNumber(totals.daysWorked, lang)],
    hours: [dict.report.totalHours, formatMinutes(totals.totalMinutes, lang)],
    tasks: [dict.report.tasksCol, formatNumber(totals.taskCount, lang)],
    remote: [dict.report.remoteDays, formatNumber(totals.remoteDays, lang)],
    leave: [dict.report.offDays, formatNumber(totals.offDays, lang)],
  };
  return fields.flatMap((field) => (values[field] ? [values[field]!] : []));
}

function finishWorkbookSheet(
  ws: XLSX.WorkSheet,
  fields: ExportField[],
  headerRow: number,
  dataRowCount: number,
  lang: string,
  dataRowHeights?: number[],
): void {
  const widths: Record<ExportField, number> = { date: 15, sessions: 20, hours: 11, tasks: 36, remote: 12, leave: 22 };
  ws["!cols"] = fields.map((field) => ({ wch: widths[field] }));
  addWorkbookLayout(ws, fields, headerRow, dataRowCount, dataRowHeights);
  applySheetView(ws, lang);
}

function taskRowHeights(body: string[][], fields: ExportField[]): number[] | undefined {
  const taskColumn = fields.indexOf("tasks");
  if (taskColumn < 0) return undefined;
  return body.slice(0, -1).map((row) => Math.max(22, (row[taskColumn]?.split("\n").length ?? 1) * 14 + 8));
}

export function exportExcel(meta: ReportMeta, rows: MonthDayRow[], dict: Dict, fields: ExportField[] = EXPORT_FIELDS): void {
  const chosen = normalizeExportFields(fields);
  if (chosen.length === 0) return;
  const { title, header, body } = monthSheetContent(meta, rows, dict, chosen);
  const totals = monthTotals(rows);
  const subtitle = `${meta.displayName} · ${meta.email}`;
  const ws = XLSX.utils.aoa_to_sheet([
    ...workbookIntro(title, subtitle, workbookSummary(chosen, totals, dict, meta.lang)),
    header,
    ...body,
  ]);
  finishWorkbookSheet(ws, chosen, 4, rows.length, meta.lang, taskRowHeights(body, chosen));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${meta.year}-${String(meta.month).padStart(2, "0")}`);
  XLSX.writeFile(wb, `report-${meta.year}-${String(meta.month).padStart(2, "0")}.xlsx`);
}

function selectionFileTag(packs: MonthPack[]): string {
  if (packs.length >= 12) return "";
  return `-m${packs.map((p) => p.month).join("-")}`;
}

/**
 * Multi-month Excel export: a Summary sheet (every selected month, even empty
 * ones, plus a grand total) followed by one sheet per month that has data.
 */
export function exportManyExcel(base: YearMeta, packs: MonthPack[], dict: Dict, fields: ExportField[] = EXPORT_FIELDS): void {
  if (packs.length === 0) return;
  const chosen = normalizeExportFields(fields);
  if (chosen.length === 0) return;
  const sorted = [...packs].sort((a, b) => a.month - b.month);
  const wb = XLSX.utils.book_new();

  const summaryColumns: Record<ExportField, { label: string; value: (pack: MonthPack) => string }> = {
    date: { label: dict.report.monthCol, value: (pack) => exportMonthLabel(base.year, pack.month, base.lang, base.calendar) },
    sessions: { label: dict.report.daysWorked, value: (pack) => formatNumber(monthTotals(pack.rows).daysWorked, base.lang) },
    hours: { label: dict.report.totalHours, value: (pack) => formatMinutes(monthTotals(pack.rows).totalMinutes, base.lang) },
    tasks: { label: dict.report.tasksCol, value: (pack) => formatNumber(monthTotals(pack.rows).taskCount, base.lang) },
    remote: { label: dict.report.remoteDays, value: (pack) => formatNumber(monthTotals(pack.rows).remoteDays, base.lang) },
    leave: { label: dict.report.offDays, value: (pack) => formatNumber(monthTotals(pack.rows).offDays, base.lang) },
  };
  const summaryFields = chosen;
  const summaryHeader = summaryFields.map((field) => summaryColumns[field].label);
  const summaryBody = sorted.map((p) => {
    return summaryFields.map((field) => summaryColumns[field].value(p));
  });
  const grandMinutes = sorted.reduce((a, p) => a + monthTotals(p.rows).totalMinutes, 0);
  const grandDays = sorted.reduce((a, p) => a + monthTotals(p.rows).daysWorked, 0);
  const grandRemote = sorted.reduce((a, p) => a + monthTotals(p.rows).remoteDays, 0);
  const grandTasks = sorted.reduce((total, pack) => total + monthTotals(pack.rows).taskCount, 0);
  const grandOffDays = sorted.reduce((total, pack) => total + monthTotals(pack.rows).offDays, 0);
  summaryBody.push(
    summaryFields.map((field) => {
      if (field === "date") return dict.report.total;
      if (field === "sessions") return formatNumber(grandDays, base.lang);
      if (field === "hours") return formatMinutes(grandMinutes, base.lang);
      if (field === "tasks") return formatNumber(grandTasks, base.lang);
      if (field === "remote") return formatNumber(grandRemote, base.lang);
      if (field === "leave") return formatNumber(grandOffDays, base.lang);
      return "";
    }),
  );
  const summaryTotals = {
    totalMinutes: grandMinutes,
    daysWorked: grandDays,
    remoteDays: grandRemote,
    taskCount: grandTasks,
    offDays: grandOffDays,
  };
  const summary = XLSX.utils.aoa_to_sheet([
    ...workbookIntro(
      `${dict.report.title} — ${formatNumber(base.year, base.lang)}`,
      `${base.displayName} · ${base.email}`,
      workbookSummary(summaryFields, summaryTotals, dict, base.lang),
    ),
    summaryHeader,
    ...summaryBody,
  ]);
  finishWorkbookSheet(summary, summaryFields, 4, sorted.length, base.lang);
  XLSX.utils.book_append_sheet(wb, summary, dict.report.summarySheet);

  for (const p of sorted) {
    if (!p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0 || r.dayOff)) continue; // empty months live in Summary only
    const { title, header, body } = monthSheetContent({ ...base, month: p.month }, p.rows, dict, chosen);
    const totals = monthTotals(p.rows);
    const ws = XLSX.utils.aoa_to_sheet([
      ...workbookIntro(title, `${base.displayName} · ${base.email}`, workbookSummary(chosen, totals, dict, base.lang)),
      header,
      ...body,
    ]);
    finishWorkbookSheet(ws, chosen, 4, p.rows.length, base.lang, taskRowHeights(body, chosen));
    XLSX.utils.book_append_sheet(wb, ws, formatNumber(p.month, base.lang).padStart(2, base.lang === "fa" ? "۰" : "0"));
  }
  XLSX.writeFile(wb, `report-${base.year}${selectionFileTag(sorted)}.xlsx`);
}

/** PDF export: opens a print-ready RTL-aware document in a new window (user saves as PDF). */
export function exportPdf(meta: ReportMeta, rows: MonthDayRow[], dict: Dict, fields: ExportField[] = EXPORT_FIELDS): void {
  const chosen = normalizeExportFields(fields);
  if (chosen.length === 0) return;
  const totals = monthTotals(rows);
  const { totalMinutes, daysWorked, remoteDays, offDays } = totals;
  const rtl = meta.lang === "fa";
  const fontStack = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Plus Jakarta Sans, Arial, sans-serif";
  const section = monthSectionHtml(exportMonthLabel(meta.year, meta.month, meta.lang, meta.calendar), rows, meta.lang, dict, false, chosen, false);
  const html = `<!doctype html><html lang="${meta.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${meta.year}/${meta.month}</title>
${pdfStyle(fontStack, rtl)}
</head><body>
<main class="report">
${reportHeaderHtml(dict.report.title, `${formatNumber(meta.year, meta.lang)}/${formatNumber(meta.month, meta.lang).padStart(2, meta.lang === "fa" ? "۰" : "0")}`, meta.displayName, meta.email, exportMetricEntries(chosen, totals, dict, meta.lang))}
${section}
</main>
<button class="print-action" onclick="window.print()">${escapeHtml(dict.report.printPdf)}</button>
<script>window.onload=()=>document.fonts.ready.then(()=>window.print())</script>
</body></html>`;
  openPrintWindow(html);
}

/**
 * Multi-month PDF export: one print document with a grand-total header and one
 * section per selected month that has data (each starts on a fresh page).
 */
export function exportManyPdf(base: YearMeta, packs: MonthPack[], dict: Dict, fields: ExportField[] = EXPORT_FIELDS): void {
  if (packs.length === 0) return;
  const chosen = normalizeExportFields(fields);
  if (chosen.length === 0) return;
  const sorted = [...packs].sort((a, b) => a.month - b.month);
  const withData = sorted.filter((p) => p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0 || r.dayOff));
  if (withData.length === 0) return;
  const rtl = base.lang === "fa";
  const fontStack = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Plus Jakarta Sans, Arial, sans-serif";
  const grandMinutes = sorted.reduce((a, p) => a + monthTotals(p.rows).totalMinutes, 0);
  const grandDays = sorted.reduce((a, p) => a + monthTotals(p.rows).daysWorked, 0);
  const grandRemote = sorted.reduce((a, p) => a + monthTotals(p.rows).remoteDays, 0);
  const grandOffDays = sorted.reduce((a, p) => a + monthTotals(p.rows).offDays, 0);
  const grandTasks = sorted.reduce((a, p) => a + monthTotals(p.rows).taskCount, 0);
  const grandTotals = { totalMinutes: grandMinutes, daysWorked: grandDays, remoteDays: grandRemote, taskCount: grandTasks, offDays: grandOffDays };
  const sections = withData
    .map((p, i) => monthSectionHtml(exportMonthLabel(base.year, p.month, base.lang, base.calendar), p.rows, base.lang, dict, i > 0, chosen))
    .join("\n");
  const html = `<!doctype html><html lang="${base.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${base.year}</title>
${pdfStyle(fontStack, rtl)}
</head><body>
<main class="report">
${reportHeaderHtml(dict.report.title, formatNumber(base.year, base.lang), base.displayName, base.email, exportMetricEntries(chosen, grandTotals, dict, base.lang))}
${sections}
</main>
<button class="print-action" onclick="window.print()">${escapeHtml(dict.report.printPdf)}</button>
<script>window.onload=()=>document.fonts.ready.then(()=>window.print())</script>
</body></html>`;
  openPrintWindow(html);
}

function pdfStyle(fontStack: string, rtl: boolean): string {
  const fontFace = rtl
    ? "@font-face{font-family:Vazirmatn;src:url('/fonts/vazirmatn-arabic-wght-normal.woff2') format('woff2');font-style:normal;font-weight:100 900;font-display:swap}"
    : "";
  return `<style>
${fontFace}
*{box-sizing:border-box}
@page{size:A4 landscape;margin:13mm}
body{font-family:${fontStack};color:#17251f;background:#f2f5f2;margin:0;padding:28px;direction:${rtl ? "rtl" : "ltr"};font-size:12px}
.report{max-width:1280px;margin:0 auto;background:#fff;border:1px solid #dce5de;border-radius:18px;overflow:hidden;box-shadow:0 16px 42px rgba(20,45,31,.08)}
.report-head{position:relative;background:#173e30;color:#fff;padding:27px 32px 25px;overflow:hidden}
.report-head:after{content:"";position:absolute;width:260px;height:260px;border:1px solid rgba(255,255,255,.12);border-radius:50%;inset-inline-end:-90px;top:-150px;box-shadow:0 0 0 28px rgba(255,255,255,.035),0 0 0 58px rgba(255,255,255,.025)}
.eyebrow{position:relative;z-index:1;margin:0 0 7px;color:#b7d9c4;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.report-head h1{position:relative;z-index:1;margin:0;font-size:25px;line-height:1.25;font-weight:800;letter-spacing:-.025em}
.identity{position:relative;z-index:1;margin:7px 0 0;color:#d6e5dc;font-size:11px}
.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;padding:18px 24px 5px}
.metric{min-width:0;padding:12px 15px;border:1px solid #e1e9e3;border-radius:11px;background:#fbfcfb}
.metric-label{margin:0;color:#68776e;font-size:10px;font-weight:700;white-space:nowrap}
.metric-value{margin:5px 0 0;color:#173e30;font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap}
.month-section{padding:18px 24px 24px}
.month-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #e4ebe6}
.month-head h2{margin:0;color:#173e30;font-size:16px;font-weight:800}
.month-summary{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:4px 12px;margin:0;color:#64746a;font-size:10px;text-align:end}
.month-summary span{white-space:nowrap}
.table-wrap{width:100%;overflow:hidden;border:1px solid #dfe7e1;border-radius:10px}
table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:10.5px;line-height:1.5;text-align:${rtl ? "right" : "left"}}
thead{display:table-header-group}
th,td{padding:9px 11px;border-bottom:1px solid #e8eeea;vertical-align:top;text-align:${rtl ? "right" : "left"};overflow-wrap:normal;word-break:normal}
th{background:#eaf2ec;color:#294c39;font-size:9.5px;font-weight:800;letter-spacing:.025em;white-space:nowrap}
.nowrap{white-space:nowrap;overflow-wrap:normal;word-break:normal}
.task-cell,.leave-cell{white-space:normal;overflow-wrap:break-word;word-break:normal}
tbody tr:nth-child(even){background:#f8faf8}
tbody tr:last-child td{border-bottom:0}
tbody td{color:#35443a}
td:first-child,td:nth-child(3){font-variant-numeric:tabular-nums}
tfoot td{border-top:2px solid #cbd9ce;border-bottom:0;background:#f0f5f1;color:#173e30;font-weight:800}
.pagebreak{break-before:page;page-break-before:always}
.print-action{display:block;margin:18px auto 0;padding:10px 17px;border:0;border-radius:9px;background:#173e30;color:#fff;font:700 12px ${fontStack};cursor:pointer}
@media(max-width:680px){body{padding:12px}.report-head{padding:22px 19px}.report-head h1{font-size:21px}.metrics{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:12px 12px 2px}.metric{padding:10px}.metric-value{font-size:16px}.month-section{padding:14px 12px 16px}.month-head{align-items:flex-start;flex-direction:column;gap:5px}.month-summary{justify-content:flex-start;text-align:start}table{font-size:8px}th,td{padding:5px 4px}th{font-size:7.5px}}
@media print{body{padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.report{max-width:none;border:0;border-radius:0;box-shadow:none;overflow:visible}.report-head{break-inside:avoid;print-color-adjust:exact}.metrics{break-inside:avoid}.month-section{padding:13px 18px 18px}.month-head{break-after:avoid}.table-wrap{overflow:visible;border-radius:0}table{font-size:9px}th,td{padding:6px 8px}tr{break-inside:avoid}.print-action{display:none}}
</style>`;
}

function reportHeaderHtml(
  title: string,
  period: string,
  displayName: string,
  email: string,
  metrics: Array<[string, string]>,
): string {
  return `<header class="report-head">
<p class="eyebrow">${escapeHtml(title)}</p><h1>${escapeHtml(period)}</h1>
<p class="identity">${escapeHtml(displayName)}${email ? ` · ${escapeHtml(email)}` : ""}</p>
</header><section class="metrics" aria-label="${escapeHtml(title)}">${metrics.map(([label, value]) => `<article class="metric"><p class="metric-label">${escapeHtml(label)}</p><p class="metric-value">${escapeHtml(value)}</p></article>`).join("")}</section>`;
}

/** One month table (header + rows + footer) for the PDF document. */
function monthSectionHtml(
  title: string,
  rows: MonthDayRow[],
  lang: string,
  dict: Dict,
  pageBreakBefore: boolean,
  fields: ExportField[],
  includeSummary = true,
): string {
  const { totalMinutes, daysWorked, remoteDays, taskCount, offDays } = monthTotals(rows);
  const columns: Record<ExportField, { label: string; value: (row: MonthDayRow) => string }> = {
    date: { label: dict.report.date, value: (row) => exportDate(row.date, lang) },
    sessions: { label: dict.report.sessionsCol, value: (row) => sessionCell(row.sessions, lang) },
    hours: { label: dict.report.hoursCol, value: (row) => formatMinutes(row.totalMinutes, lang) },
    tasks: { label: dict.report.tasksCol, value: (row) => tasksCell(row.tasks) || "—" },
    remote: { label: dict.report.remoteCol, value: (row) => remoteCell(row.sessions, dict) },
    leave: { label: dict.report.leaveCol, value: (row) => row.dayOff ? dict.leave.types[row.dayOff] : "—" },
  };
  const chosen = normalizeExportFields(fields);
  const columnWeights: Record<ExportField, number> = {
    date: 13,
    sessions: 22,
    hours: 12,
    tasks: 24,
    remote: 13,
    leave: 16,
  };
  const totalWeight = chosen.reduce((total, field) => total + columnWeights[field], 0);
  const colgroup = `<colgroup>${chosen.map((field) => `<col style="width:${(columnWeights[field] / totalWeight) * 100}%">`).join("")}</colgroup>`;
  const rowsHtml = rows
    .map(
      (row) => `<tr>${chosen.map((field) => `<td class="${field === "tasks" ? "task-cell" : field === "leave" ? "leave-cell" : "nowrap"}">${escapeHtml(columns[field].value(row))}</td>`).join("")}</tr>`,
    )
    .join("");
  const footer = chosen
    .map((field) => {
      let value = "";
      if (field === "date") value = dict.report.total;
      else if (field === "sessions") value = `${dict.report.daysWorked}: ${formatNumber(daysWorked, lang)}`;
      else if (field === "hours") value = formatMinutes(totalMinutes, lang);
      else if (field === "tasks") value = formatNumber(taskCount, lang);
      else if (field === "remote") value = `${dict.report.remoteDays}: ${formatNumber(remoteDays, lang)}`;
      else if (field === "leave") value = `${dict.report.offDays}: ${formatNumber(offDays, lang)}`;
      return `<td>${escapeHtml(value)}</td>`;
    })
    .join("");
  return `<section class="month-section ${pageBreakBefore ? "pagebreak" : ""}">
<header class="month-head"><h2>${escapeHtml(title)}</h2>${includeSummary ? `<p class="month-summary">${exportMetricEntries(chosen, monthTotals(rows), dict, lang).map(([label, value]) => `<span>${escapeHtml(label)}: ${escapeHtml(value)}</span>`).join("")}</p>` : ""}</header>
<div class="table-wrap"><table>${colgroup}<thead><tr>${chosen.map((field) => `<th>${escapeHtml(columns[field].label)}</th>`).join("")}</tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr>${footer}</tr></tfoot></table></div>
</section>`;
}

function openPrintWindow(html: string): void {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
