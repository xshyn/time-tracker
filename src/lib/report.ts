import * as XLSX from "xlsx";
import { formatMinutes } from "./dates";
import type { MonthDayRow } from "./types";
import type { Dict } from "./i18n/en";

export interface ReportMeta {
  displayName: string;
  email: string;
  year: number;
  month: number; // 1-12
  lang: "en" | "fa";
}

/** Base identity for multi-month / whole-year exports. */
export interface YearMeta {
  displayName: string;
  email: string;
  year: number;
  lang: "en" | "fa";
}

export interface MonthPack {
  month: number; // 1-12
  rows: MonthDayRow[];
}

export function monthTotals(rows: MonthDayRow[]): { totalMinutes: number; daysWorked: number; remoteDays: number } {
  const totalMinutes = rows.reduce((a, r) => a + r.totalMinutes, 0);
  const daysWorked = rows.filter((r) => r.totalMinutes > 0 || r.tasks.length > 0).length;
  const remoteDays = rows.filter((r) => r.sessions.length > 0 && r.sessions.every((s) => s.isRemote)).length;
  return { totalMinutes, daysWorked, remoteDays };
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
function monthSheetContent(meta: ReportMeta, rows: MonthDayRow[], dict: Dict): { title: string; header: string[]; body: string[][] } {
  const { totalMinutes, daysWorked, remoteDays } = monthTotals(rows);
  const header = [dict.report.date, dict.report.sessionsCol, dict.report.hoursCol, dict.report.tasksCol, dict.report.remoteCol];
  const body = rows.map((r) => [
    r.date,
    sessionCell(r.sessions, meta.lang),
    formatMinutes(r.totalMinutes),
    tasksCell(r.tasks),
    remoteCell(r.sessions, dict),
  ]);
  body.push([dict.report.total, `${dict.report.daysWorked}: ${daysWorked}`, formatMinutes(totalMinutes), `${dict.report.remoteDays}: ${remoteDays}`, ""]);
  return { title: `${meta.displayName} — ${meta.year}/${String(meta.month).padStart(2, "0")}`, header, body };
}

function applySheetView(ws: XLSX.WorkSheet, lang: string): void {
  // RTL sheet view for Persian so Excel opens right-to-left
  if (lang === "fa") {
    (ws as Record<string, unknown>)["!views"] = [{ rightToLeft: true }];
  }
}

export function exportExcel(meta: ReportMeta, rows: MonthDayRow[], dict: Dict): void {
  const { title, header, body } = monthSheetContent(meta, rows, dict);
  const ws = XLSX.utils.aoa_to_sheet([[title], [], header, ...body]);
  ws["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 60 }, { wch: 12 }];
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
export function exportManyExcel(base: YearMeta, packs: MonthPack[], dict: Dict): void {
  if (packs.length === 0) return;
  const sorted = [...packs].sort((a, b) => a.month - b.month);
  const wb = XLSX.utils.book_new();

  const summaryHeader = [dict.report.monthCol, dict.report.daysWorked, dict.report.totalHours, dict.report.remoteDays];
  const summaryBody = sorted.map((p) => {
    const t = monthTotals(p.rows);
    return [monthLabel(base.year, p.month, base.lang), String(t.daysWorked), formatMinutes(t.totalMinutes), String(t.remoteDays)];
  });
  const grandMinutes = sorted.reduce((a, p) => a + monthTotals(p.rows).totalMinutes, 0);
  const grandDays = sorted.reduce((a, p) => a + monthTotals(p.rows).daysWorked, 0);
  const grandRemote = sorted.reduce((a, p) => a + monthTotals(p.rows).remoteDays, 0);
  summaryBody.push([dict.report.total, String(grandDays), formatMinutes(grandMinutes), String(grandRemote)]);
  const summary = XLSX.utils.aoa_to_sheet([
    [`${base.displayName} — ${base.year}`],
    [],
    summaryHeader,
    ...summaryBody,
  ]);
  summary["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 12 }, { wch: 14 }];
  applySheetView(summary, base.lang);
  XLSX.utils.book_append_sheet(wb, summary, dict.report.summarySheet);

  for (const p of sorted) {
    if (!p.rows.some((r) => r.sessions.length > 0 || r.tasks.length > 0)) continue; // empty months live in Summary only
    const { title, header, body } = monthSheetContent({ ...base, month: p.month }, p.rows, dict);
    const ws = XLSX.utils.aoa_to_sheet([[title], [], header, ...body]);
    ws["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 60 }, { wch: 12 }];
    applySheetView(ws, base.lang);
    XLSX.utils.book_append_sheet(wb, ws, `${String(p.month).padStart(2, "0")}`);
  }
  XLSX.writeFile(wb, `report-${base.year}${selectionFileTag(sorted)}.xlsx`);
}

/** PDF export: opens a print-ready RTL-aware document in a new window (user saves as PDF). */
export function exportPdf(meta: ReportMeta, rows: MonthDayRow[], dict: Dict): void {
  const { totalMinutes, daysWorked, remoteDays } = monthTotals(rows);
  const rtl = meta.lang === "fa";
  const fontStack = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Plus Jakarta Sans, Arial, sans-serif";
  const section = monthSectionHtml(monthLabel(meta.year, meta.month, meta.lang), rows, meta.lang, dict, false);
  const html = `<!doctype html><html lang="${meta.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${meta.year}/${meta.month}</title>
${pdfStyle(fontStack, rtl)}
</head><body>
<h1>${escapeHtml(dict.report.title)} — ${meta.year}/${String(meta.month).padStart(2, "0")}</h1>
<p class="sub">${escapeHtml(meta.displayName)} (${escapeHtml(meta.email)}) · ${escapeHtml(dict.report.totalHours)}: ${formatMinutes(totalMinutes)} · ${escapeHtml(dict.report.daysWorked)}: ${daysWorked} · ${escapeHtml(dict.report.remoteDays)}: ${remoteDays}</p>
${section}
<br><button onclick="window.print()">Print / Save as PDF</button>
<script>window.onload=()=>window.print()</script>
</body></html>`;
  openPrintWindow(html);
}

/**
 * Multi-month PDF export: one print document with a grand-total header and one
 * section per selected month that has data (each starts on a fresh page).
 */
export function exportManyPdf(base: YearMeta, packs: MonthPack[], dict: Dict): void {
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
    .map((p, i) => monthSectionHtml(monthLabel(base.year, p.month, base.lang), p.rows, base.lang, dict, i > 0))
    .join("\n");
  const html = `<!doctype html><html lang="${base.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${base.year}</title>
${pdfStyle(fontStack, rtl)}
</head><body>
<h1>${escapeHtml(dict.report.title)} — ${base.year}</h1>
<p class="sub">${escapeHtml(base.displayName)} (${escapeHtml(base.email)}) · ${escapeHtml(dict.report.totalHours)}: ${formatMinutes(grandMinutes)} · ${escapeHtml(dict.report.daysWorked)}: ${grandDays} · ${escapeHtml(dict.report.remoteDays)}: ${grandRemote}</p>
${sections}
<br><button onclick="window.print()">Print / Save as PDF</button>
<script>window.onload=()=>window.print()</script>
</body></html>`;
  openPrintWindow(html);
}

function pdfStyle(fontStack: string, rtl: boolean): string {
  return `<style>
body{font-family:${fontStack};color:#134E4A;margin:32px}
h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 4px} p.sub{color:#475569;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #99F6E4;padding:6px 8px;text-align:${rtl ? "right" : "left"}}
th{background:#F0FDFA} tfoot td{font-weight:bold;background:#F0FDFA}
.pagebreak{break-before:page}
@media print{button{display:none}}
</style>`;
}

/** One month table (header + rows + footer) for the PDF document. */
function monthSectionHtml(title: string, rows: MonthDayRow[], lang: string, dict: Dict, pageBreakBefore: boolean): string {
  const { totalMinutes, daysWorked, remoteDays } = monthTotals(rows);
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.date}</td>
        <td>${escapeHtml(sessionCell(r.sessions, lang))}</td>
        <td>${formatMinutes(r.totalMinutes)}</td>
        <td style="white-space:pre-wrap">${escapeHtml(tasksCell(r.tasks)) || "—"}</td>
        <td>${escapeHtml(remoteCell(r.sessions, dict))}</td>
      </tr>`,
    )
    .join("");
  return `<div class="${pageBreakBefore ? "pagebreak" : ""}">
<h2>${escapeHtml(title)}</h2>
<p class="sub">${escapeHtml(dict.report.totalHours)}: ${formatMinutes(totalMinutes)} · ${escapeHtml(dict.report.daysWorked)}: ${daysWorked} · ${escapeHtml(dict.report.remoteDays)}: ${remoteDays}</p>
<table><thead><tr><th>${escapeHtml(dict.report.date)}</th><th>${escapeHtml(dict.report.sessionsCol)}</th><th>${escapeHtml(dict.report.hoursCol)}</th><th>${escapeHtml(dict.report.tasksCol)}</th><th>${escapeHtml(dict.report.remoteCol)}</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td>${escapeHtml(dict.report.total)}</td><td>${escapeHtml(dict.report.daysWorked)}: ${daysWorked}</td><td>${formatMinutes(totalMinutes)}</td><td>${escapeHtml(dict.report.remoteDays)}: ${remoteDays}</td><td></td></tr></tfoot></table>
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
