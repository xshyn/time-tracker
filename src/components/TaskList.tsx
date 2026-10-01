"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import type { Dict } from "@/lib/i18n/en";
import { EmptyState } from "./ui";

type Filter = "all" | "active" | "done";

export function TaskList({
  tasks,
  dict,
  onToggle,
  onDelete,
  onEdit,
  onClearCompleted,
}: {
  tasks: Task[];
  dict: Dict;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onClearCompleted: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => Number(a.isDone) - Number(b.isDone) || a.createdAt.localeCompare(b.createdAt)),
    [tasks],
  );
  const visible = sorted.filter((t) => (filter === "all" ? true : filter === "active" ? !t.isDone : t.isDone));
  const doneCount = tasks.filter((t) => t.isDone).length;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: dict.task.filterAll },
    { key: "active", label: dict.task.filterActive },
    { key: "done", label: dict.task.filterDone },
  ];

  return (
    <div>
      {tasks.length > 0 ? (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{dict.task.progress.replace("{done}", String(doneCount)).replace("{total}", String(tasks.length))}</span>
            {doneCount > 0 ? (
              <button className="cursor-pointer font-medium text-destructive hover:underline" onClick={onClearCompleted}>
                {dict.task.clearCompleted}
              </button>
            ) : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-card" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={tasks.length}>
            <div
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${tasks.length === 0 ? 0 : (doneCount / tasks.length) * 100}%` }}
            />
          </div>
          <div className="mt-2 inline-flex rounded-xl border border-border bg-card p-0.5 backdrop-blur-md" role="tablist" aria-label={dict.task.title}>
            {filters.map((f) => (
              <button
                key={f.key}
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`cursor-pointer rounded-[0.65rem] px-3 py-1 text-xs font-semibold transition-all duration-150 ${
                  filter === f.key ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          message={tasks.length === 0 ? dict.task.empty : filter === "active" ? dict.task.emptyActive : dict.task.emptyDone}
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className={`flex items-start gap-2.5 rounded-xl border border-border bg-card p-2.5 backdrop-blur-md transition-all duration-150 ${
                t.isDone ? "opacity-70" : ""
              }`}
            >
              <button
                role="checkbox"
                aria-checked={t.isDone}
                aria-label={t.isDone ? `${dict.task.markUndone}: ${t.title}` : `${dict.task.markDone}: ${t.title}`}
                onClick={() => onToggle(t)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 transition-all duration-150 ${
                  t.isDone ? "border-primary-light bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary-light"
                }`}
              >
                {t.isDone ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : null}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium break-words ${t.isDone ? "text-muted-foreground line-through" : ""}`}>
                  {t.title}
                </p>
                {t.description ? <p className="mt-0.5 text-xs text-muted-foreground break-words">{t.description}</p> : null}
              </div>
              <div className="flex shrink-0 gap-1">
                {onEdit ? (
                  <button
                    className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-pine hover:text-primary-light"
                    aria-label={`${dict.task.edit}: ${t.title}`}
                    onClick={() => onEdit(t)}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                ) : null}
                <button
                  className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-pine hover:text-destructive"
                  aria-label={`${dict.task.del}: ${t.title}`}
                  onClick={() => onDelete(t)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
