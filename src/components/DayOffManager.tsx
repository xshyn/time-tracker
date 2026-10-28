"use client";

import { CalendarDays, Check, ChevronDown, Trash2, TriangleAlert } from "lucide-react";
import type { Dict } from "@/lib/i18n/en";
import type { DayOffType } from "@/lib/types";
import { Badge, Button, Card, Field } from "@/components/ui";

export function DayOffManager({
  value,
  selection,
  busy,
  error,
  saved,
  dict,
  onSelectionChange,
  onSave,
  onRemove,
}: {
  value: DayOffType | null;
  selection: DayOffType | "";
  busy: boolean;
  error: boolean;
  saved: boolean;
  dict: Dict;
  onSelectionChange: (value: DayOffType | "") => void;
  onSave: () => void;
  onRemove: () => void;
}) {
  return (
    <Card padding={false} className={`overflow-hidden ${value ? "border-accent/35" : ""}`}>
      <div className="flex items-start gap-3 border-b border-border/70 px-4 py-4 sm:px-5">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${value ? "bg-accent/15 text-accent-dark dark:text-accent-light" : "bg-primary/10 text-primary-light"}`}>
          <CalendarDays size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight">{dict.leave.title}</h2>
            {value ? <Badge tone="accent">{dict.leave.types[value]}</Badge> : null}
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">{dict.leave.description}</p>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field label={dict.leave.chooseType}>
          <span className="relative block">
            <select
              value={selection}
              disabled={busy}
              onChange={(event) => onSelectionChange(event.target.value as DayOffType | "")}
              className="w-full min-w-0 appearance-none rounded-xl border border-border bg-card py-2.5 pe-10 ps-3 text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:border-primary-light/40 focus:border-primary-light focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{dict.leave.chooseType}</option>
              {Object.entries(dict.leave.types).map(([type, label]) => (
                <option key={type} value={type}>{label}</option>
              ))}
            </select>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
          </span>
        </Field>

        <div className="grid gap-2 sm:grid-cols-2 md:flex">
          <Button
            className="w-full md:min-w-36"
            disabled={!selection || selection === value || busy}
            onClick={onSave}
          >
            <Check size={15} aria-hidden="true" />
            {busy ? dict.leave.saving : dict.leave.save}
          </Button>
          {value ? (
            <Button className="w-full md:min-w-36" variant="secondary" disabled={busy} onClick={onRemove}>
              <Trash2 size={14} aria-hidden="true" />
              {dict.leave.remove}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-2 px-4 pb-4 text-xs font-medium text-destructive sm:px-5">
          <TriangleAlert size={14} aria-hidden="true" />
          {dict.leave.saveError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="flex items-center gap-2 px-4 pb-4 text-xs font-medium text-primary-light sm:px-5">
          <Check size={14} aria-hidden="true" />
          {dict.leave.saved}
        </p>
      ) : null}
    </Card>
  );
}
