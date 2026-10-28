import type { Dict } from "@/lib/i18n/en";
import { CalendarDays, CalendarOff, Clock3, House, ListTodo, Timer } from "lucide-react";
import { formatNumber } from "@/lib/dates";
import { EXPORT_FIELDS } from "@/lib/report";
import type { ExportField } from "@/lib/report";

export function ExportFieldPicker({
  value,
  onChange,
  dict,
  lang,
}: {
  value: ExportField[];
  onChange: (fields: ExportField[]) => void;
  dict: Dict;
  lang: "en" | "fa";
}) {
  const options = [
    { field: "date", label: dict.report.date, Icon: CalendarDays },
    { field: "sessions", label: dict.report.sessionsCol, Icon: Clock3 },
    { field: "hours", label: dict.report.hoursCol, Icon: Timer },
    { field: "tasks", label: dict.report.tasksCol, Icon: ListTodo },
    { field: "remote", label: dict.report.remoteCol, Icon: House },
    { field: "leave", label: dict.report.leaveCol, Icon: CalendarOff },
  ] as const;

  const toggle = (field: ExportField) => {
    const next = new Set(value);
    if (next.has(field)) next.delete(field);
    else next.add(field);
    onChange(EXPORT_FIELDS.filter((item) => next.has(item)));
  };

  const selectAll = () => onChange([...EXPORT_FIELDS]);
  const clearAll = () => onChange([]);

  return (
    <fieldset aria-describedby="export-fields-help">
      <legend className="text-sm font-semibold">{dict.report.exportFields}</legend>
      <div className="mb-3 mt-1 flex flex-wrap items-end justify-between gap-2">
        <p id="export-fields-help" className="text-xs text-muted-foreground">{dict.report.exportFieldsHelp}</p>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          {dict.report.exportFieldsSelected.replace("{n}", formatNumber(value.length, lang))}
        </span>
      </div>

      <div className="mb-2 flex gap-3 text-xs">
        <button type="button" onClick={selectAll} disabled={value.length === EXPORT_FIELDS.length} className="cursor-pointer font-semibold text-primary-light hover:underline disabled:cursor-default disabled:opacity-50">
          {dict.report.exportSelectAll}
        </button>
        <button type="button" onClick={clearAll} disabled={value.length === 0} className="cursor-pointer font-semibold text-primary-light hover:underline disabled:cursor-default disabled:opacity-50">
          {dict.report.exportClear}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {options.map(({ field, label, Icon }) => {
          const checked = value.includes(field);
          return (
            <label
              key={field}
              className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary-light focus-within:ring-offset-2 focus-within:ring-offset-background ${checked ? "border-primary-light/60 bg-pine" : "border-border bg-card/55 hover:border-primary-light/40 hover:bg-pine/60"}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(field)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-primary-light"
              />
              <Icon size={16} className={checked ? "shrink-0 text-primary-light" : "shrink-0 text-muted-foreground"} aria-hidden="true" />
              <span className={`min-w-0 truncate font-medium ${checked ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
            </label>
          );
        })}
      </div>
      {value.length === 0 ? <p role="alert" className="mt-2 text-xs text-amber-700 dark:text-amber-300">{dict.report.exportFieldsRequired}</p> : null}
    </fieldset>
  );
}
