import type { Dict } from "@/lib/i18n/en";
import { EXPORT_FIELDS } from "@/lib/report";
import type { ExportField } from "@/lib/report";

export function ExportFieldPicker({
  value,
  onChange,
  dict,
}: {
  value: ExportField[];
  onChange: (fields: ExportField[]) => void;
  dict: Dict;
}) {
  const labels: Record<ExportField, string> = {
    date: dict.report.date,
    sessions: dict.report.sessionsCol,
    hours: dict.report.hoursCol,
    tasks: dict.report.tasksCol,
    remote: dict.report.remoteCol,
  };

  const toggle = (field: ExportField) => {
    if (value.includes(field)) {
      if (value.length > 1) onChange(value.filter((item) => item !== field));
      return;
    }
    onChange(EXPORT_FIELDS.filter((item) => item === field || value.includes(item)));
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{dict.report.exportFields}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {EXPORT_FIELDS.map((field) => (
          <label key={field} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card/60 px-2.5 py-2 text-sm">
            <input type="checkbox" checked={value.includes(field)} onChange={() => toggle(field)} />
            <span>{labels[field]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
