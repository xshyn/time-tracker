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

export type ExportField = "date" | "sessions" | "hours" | "tasks" | "remote";

export const EXPORT_FIELDS: ExportField[] = ["date", "sessions", "hours", "tasks", "remote"];

export function monthTotals(rows: MonthDayRow[]): { totalMinutes: number; daysWorked: number; remoteDays: number; taskCount: number } {
  const totalMinutes = rows.reduce((a, r) => a + r.totalMinutes, 0);
  const daysWorked = rows.filter((r) => r.totalMinutes > 0 || r.tasks.length > 0).length;
  const remoteDays = rows.filter((r) => r.sessions.length > 0 && r.sessions.every((s) => s.isRemote)).length;
  const taskCount = rows.reduce((total, row) => total + row.tasks.length, 0);
  return { totalMinutes, daysWorked, remoteDays, taskCount };
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
  return tasks.map((t) => (t.description ? `${t.title}: ${t.description}` : t.title)).join("\n");
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
  const { totalMinutes, daysWorked, remoteDays } = monthTotals(rows);
  const columns: Record<ExportField, { label: string; value: (row: MonthDayRow) => string }> = {
    date: { label: dict.report.date, value: (row) => exportDate(row.date, meta.lang) },
    sessions: { label: dict.report.sessionsCol, value: (row) => sessionCell(row.sessions, meta.lang) },
    hours: { label: dict.report.hoursCol, value: (row) => formatMinutes(row.totalMinutes, meta.lang) },
    tasks: { label: dict.report.tasksCol, value: (row) => tasksCell(row.tasks) },
    remote: { label: dict.report.remoteCol, value: (row) => remoteCell(row.sessions, dict) },
  };
  const chosen = fields.length ? fields : EXPORT_FIELDS;
  const header = chosen.map((field) => columns[field].label);
  const body = rows.map((row) => chosen.map((field) => columns[field].value(row)));
  body.push(
    chosen.map((field, index) => {
      if (index === 0) return dict.report.total;
      if (field === "sessions") return `${dict.report.daysWorked}: ${formatNumber(daysWorked, meta.lang)}`;
      if (field === "hours") return formatMinutes(totalMinutes, meta.lang);
      if (field === "remote") return `${dict.report.remoteDays}: ${formatNumber(remoteDays, meta.lang)}`;
      return "";
    }),
  );
  return { title: `${meta.displayName} — ${exportMonthLabel(meta.year, meta.month, meta.lang, meta.calendar)}`, header, body };
}

function applySheetView(ws: XLSX.WorkSheet, lang: string): void {
  // RTL sheet view for Persian so Excel opens right-to-left
  if (lang === "fa") {
    (ws as Record<string, unknown>)["!views"] = [{ rightToLeft: true }];
  }
}

export function exportExcel(meta: ReportMeta, rows: MonthDayRow[], dict: Dict, fields: ExportField[] = EXPORT_FIELDS): void {
  const chosen = fields.length ? fields : EXPORT_FIELDS;
  const { title, header, body } = monthSheetContent(meta, rows, dict, chosen);
  const ws = XLSX.utils.aoa_to_sheet([[title], [], header, ...body]);
  ws["!cols"] = chosen.map((field) => ({ wch: field === "tasks" ? 60 : field === "sessions" ? 34 : field === "date" ? 22 : 16 }));
  applySheetView(ws, meta.lang);
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
  const chosen = fields.length ? fields : EXPORT_FIELDS;
  const sorted = [...packs].sort((a, b) => a.month - b.month);
  const wb = XLSX.utils.book_new();

  const summaryColumns: Record<ExportField, { label: string; value: (pack: MonthPack) => string }> = {
    date: { label: dict.report.monthCol, value: (pack) => exportMonthLabel(base.year, pack.month, base.lang, base.calendar) },
    sessions: { label: dict.report.daysWorked, value: (pack) => formatNumber(monthTotals(pack.rows).daysWorked, base.lang) },
    hours: { label: dict.report.totalHours, value: (pack) => formatMinutes(monthTotals(pack.rows).totalMinutes, base.lang) },
    tasks: { label: dict.report.tasksCol, value: (pack) => formatNumber(monthTotals(pack.rows).taskCount, base.lang) },
    remote: { label: dict.report.remoteDays, value: (pack) => formatNumber(monthTotals(pack.rows).remoteDays, base.lang) },
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
  summaryBody.push(
    summaryFields.map((field, index) => {
      if (index === 0) return dict.report.total;
      if (field === "sessions") return formatNumber(grandDays, base.lang);
      if (field === "hours") return formatMinutes(grandMinutes, base.lang);
      if (field === "tasks") return formatNumber(grandTasks, base.lang);
      if (field === "remote") return formatNumber(grandRemote, base.lang);
      return "";
    }),
  );
  const summary = XLSX.utils.aoa_to_sheet([
    [`${base.displayName} — ${formatNumber(base.year, base.lang)}`],
    [],
    summaryHeader,
    ...summaryBody,
  ]);
  summary["!cols"] = summaryFields.map((field) => ({ wch: field === "date" ? 22 : 16 }));
  applySheetView(summary, base.lang);
  XLSX.utils.book_append_sheet(wb, summary, dict.report.summarySheet);

  for (const p of sorted) {
    if (!p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0)) continue; // empty months live in Summary only
    const { title, header, body } = monthSheetContent({ ...base, month: p.month }, p.rows, dict, chosen);
    const ws = XLSX.utils.aoa_to_sheet([[title], [], header, ...body]);
    ws["!cols"] = chosen.map((field) => ({ wch: field === "tasks" ? 60 : field === "sessions" ? 34 : field === "date" ? 22 : 16 }));
    applySheetView(ws, base.lang);
    XLSX.utils.book_append_sheet(wb, ws, formatNumber(p.month, base.lang).padStart(2, base.lang === "fa" ? "۰" : "0"));
  }
  XLSX.writeFile(wb, `report-${base.year}${selectionFileTag(sorted)}.xlsx`);
}

/** PDF export: opens a print-ready RTL-aware document in a new window (user saves as PDF). */
export function exportPdf(meta: ReportMeta, rows: MonthDayRow[], dict: Dict, fields: ExportField[] = EXPORT_FIELDS): void {
  const { totalMinutes, daysWorked, remoteDays } = monthTotals(rows);
  const rtl = meta.lang === "fa";
  const fontStack = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Plus Jakarta Sans, Arial, sans-serif";
  const section = monthSectionHtml(exportMonthLabel(meta.year, meta.month, meta.lang, meta.calendar), rows, meta.lang, dict, false, fields);
  const html = `<!doctype html><html lang="${meta.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${meta.year}/${meta.month}</title>
${pdfStyle(fontStack, rtl)}
</head><body>
<h1>${escapeHtml(dict.report.title)} — ${formatNumber(meta.year, meta.lang)}/${formatNumber(meta.month, meta.lang).padStart(2, meta.lang === "fa" ? "۰" : "0")}</h1>
<p class="sub">${escapeHtml(meta.displayName)} (${escapeHtml(meta.email)}) · ${escapeHtml(dict.report.totalHours)}: ${formatMinutes(totalMinutes, meta.lang)} · ${escapeHtml(dict.report.daysWorked)}: ${formatNumber(daysWorked, meta.lang)} · ${escapeHtml(dict.report.remoteDays)}: ${formatNumber(remoteDays, meta.lang)}</p>
${section}
<br><button onclick="window.print()">${escapeHtml(dict.report.printPdf)}</button>
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
  const sorted = [...packs].sort((a, b) => a.month - b.month);
  const withData = sorted.filter((p) => p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0));
  if (withData.length === 0) return;
  const rtl = base.lang === "fa";
  const fontStack = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Plus Jakarta Sans, Arial, sans-serif";
  const grandMinutes = sorted.reduce((a, p) => a + monthTotals(p.rows).totalMinutes, 0);
  const grandDays = sorted.reduce((a, p) => a + monthTotals(p.rows).daysWorked, 0);
  const grandRemote = sorted.reduce((a, p) => a + monthTotals(p.rows).remoteDays, 0);
  const sections = withData
    .map((p, i) => monthSectionHtml(exportMonthLabel(base.year, p.month, base.lang, base.calendar), p.rows, base.lang, dict, i > 0, fields))
    .join("\n");
  const html = `<!doctype html><html lang="${base.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${base.year}</title>
${pdfStyle(fontStack, rtl)}
</head><body>
<h1>${escapeHtml(dict.report.title)} — ${formatNumber(base.year, base.lang)}</h1>
<p class="sub">${escapeHtml(base.displayName)} (${escapeHtml(base.email)}) · ${escapeHtml(dict.report.totalHours)}: ${formatMinutes(grandMinutes, base.lang)} · ${escapeHtml(dict.report.daysWorked)}: ${formatNumber(grandDays, base.lang)} · ${escapeHtml(dict.report.remoteDays)}: ${formatNumber(grandRemote, base.lang)}</p>
${sections}
<br><button onclick="window.print()">${escapeHtml(dict.report.printPdf)}</button>
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
body{font-family:${fontStack};color:#134E4A;margin:32px;direction:${rtl ? "rtl" : "ltr"}}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 4px} p.sub{color:#475569;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #99F6E4;padding:6px 8px;text-align:${rtl ? "right" : "left"}}
th{background:#F0FDFA} tfoot td{font-weight:bold;background:#F0FDFA}
.pagebreak{break-before:page}
@media print{button{display:none}}
</style>`;
}

/** One month table (header + rows + footer) for the PDF document. */
function monthSectionHtml(
  title: string,
  rows: MonthDayRow[],
  lang: string,
  dict: Dict,
  pageBreakBefore: boolean,
  fields: ExportField[],
): string {
  const { totalMinutes, daysWorked, remoteDays } = monthTotals(rows);
  const columns: Record<ExportField, { label: string; value: (row: MonthDayRow) => string }> = {
    date: { label: dict.report.date, value: (row) => exportDate(row.date, lang) },
    sessions: { label: dict.report.sessionsCol, value: (row) => sessionCell(row.sessions, lang) },
    hours: { label: dict.report.hoursCol, value: (row) => formatMinutes(row.totalMinutes, lang) },
    tasks: { label: dict.report.tasksCol, value: (row) => tasksCell(row.tasks) || "—" },
    remote: { label: dict.report.remoteCol, value: (row) => remoteCell(row.sessions, dict) },
  };
  const chosen = fields.length ? fields : EXPORT_FIELDS;
  const rowsHtml = rows
    .map(
      (row) => `<tr>${chosen.map((field) => `<td${field === "tasks" ? ' style="white-space:pre-wrap"' : ""}>${escapeHtml(columns[field].value(row))}</td>`).join("")}</tr>`,
    )
    .join("");
  const footer = chosen
    .map((field, index) => {
      let value = "";
      if (index === 0) value = dict.report.total;
      else if (field === "sessions") value = `${dict.report.daysWorked}: ${formatNumber(daysWorked, lang)}`;
      else if (field === "hours") value = formatMinutes(totalMinutes, lang);
      else if (field === "remote") value = `${dict.report.remoteDays}: ${formatNumber(remoteDays, lang)}`;
      return `<td>${escapeHtml(value)}</td>`;
    })
    .join("");
  return `<div class="${pageBreakBefore ? "pagebreak" : ""}">
<h2>${escapeHtml(title)}</h2>
<p class="sub">${escapeHtml(dict.report.totalHours)}: ${formatMinutes(totalMinutes, lang)} · ${escapeHtml(dict.report.daysWorked)}: ${formatNumber(daysWorked, lang)} · ${escapeHtml(dict.report.remoteDays)}: ${formatNumber(remoteDays, lang)}</p>
<table><thead><tr>${chosen.map((field) => `<th>${escapeHtml(columns[field].label)}</th>`).join("")}</tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr>${footer}</tr></tfoot></table>
</div>`;
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
