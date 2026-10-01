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

export function monthTotals(rows: MonthDayRow[]): { totalMinutes: number; daysWorked: number } {
  const totalMinutes = rows.reduce((a, r) => a + r.totalMinutes, 0);
  const daysWorked = rows.filter((r) => r.totalMinutes > 0 || r.tasks.length > 0).length;
  return { totalMinutes, daysWorked };
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

export function exportExcel(meta: ReportMeta, rows: MonthDayRow[], dict: Dict): void {
  const { totalMinutes, daysWorked } = monthTotals(rows);
  const header = [dict.report.date, dict.report.sessionsCol, dict.report.hoursCol, dict.report.tasksCol];
  const body = rows.map((r) => [
    r.date,
    sessionCell(r.sessions, meta.lang),
    formatMinutes(r.totalMinutes),
    tasksCell(r.tasks),
  ]);
  body.push([dict.report.total, `${dict.report.daysWorked}: ${daysWorked}`, formatMinutes(totalMinutes), ""]);
  const title = `${meta.displayName} — ${meta.year}/${String(meta.month).padStart(2, "0")}`;
  const ws = XLSX.utils.aoa_to_sheet([[title], [], header, ...body]);
  ws["!cols"] = [{ wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 60 }];
  // RTL sheet view for Persian so Excel opens right-to-left
  if (meta.lang === "fa") {
    (ws as Record<string, unknown>)["!views"] = [{ rightToLeft: true }];
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${meta.year}-${String(meta.month).padStart(2, "0")}`);
  XLSX.writeFile(wb, `report-${meta.year}-${String(meta.month).padStart(2, "0")}.xlsx`);
}

/** PDF export: opens a print-ready RTL-aware document in a new window (user saves as PDF). */
export function exportPdf(meta: ReportMeta, rows: MonthDayRow[], dict: Dict): void {
  const { totalMinutes, daysWorked } = monthTotals(rows);
  const rtl = meta.lang === "fa";
  const fontStack = rtl ? "Vazirmatn, Tahoma, sans-serif" : "Plus Jakarta Sans, Arial, sans-serif";
  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>${r.date}</td>
        <td>${escapeHtml(sessionCell(r.sessions, meta.lang))}</td>
        <td>${formatMinutes(r.totalMinutes)}</td>
        <td style="white-space:pre-wrap">${escapeHtml(tasksCell(r.tasks)) || "—"}</td>
      </tr>`,
    )
    .join("");
  const html = `<!doctype html><html lang="${meta.lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<title>${escapeHtml(dict.report.title)} ${meta.year}/${meta.month}</title>
<style>
body{font-family:${fontStack};color:#134E4A;margin:32px}
h1{font-size:20px;margin:0 0 4px} p.sub{color:#475569;margin:0 0 16px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #99F6E4;padding:6px 8px;text-align:${rtl ? "right" : "left"}}
th{background:#F0FDFA} tfoot td{font-weight:bold;background:#F0FDFA}
@media print{button{display:none}}
</style></head><body>
<h1>${escapeHtml(dict.report.title)} — ${meta.year}/${String(meta.month).padStart(2, "0")}</h1>
<p class="sub">${escapeHtml(meta.displayName)} (${escapeHtml(meta.email)}) · ${escapeHtml(dict.report.totalHours)}: ${formatMinutes(totalMinutes)} · ${escapeHtml(dict.report.daysWorked)}: ${daysWorked}</p>
<table><thead><tr><th>${escapeHtml(dict.report.date)}</th><th>${escapeHtml(dict.report.sessionsCol)}</th><th>${escapeHtml(dict.report.hoursCol)}</th><th>${escapeHtml(dict.report.tasksCol)}</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td>${escapeHtml(dict.report.total)}</td><td>${escapeHtml(dict.report.daysWorked)}: ${daysWorked}</td><td>${formatMinutes(totalMinutes)}</td><td></td></tr></tfoot></table>
<br><button onclick="window.print()">Print / Save as PDF</button>
<script>window.onload=()=>window.print()</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
