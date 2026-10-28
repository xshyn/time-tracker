"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCheck,
  CircleCheck,
  Clock3,
  Eraser,
  ListChecks,
  ListFilter,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Task } from "@/lib/types";
import type { Dict } from "@/lib/i18n/en";
import type { Language } from "@/lib/types";
import { formatNumber, formatTime } from "@/lib/dates";
import { EmptyState, IconButton, ProgressRing, SegmentedControl } from "./ui";

type Filter = "all" | "active" | "done";

export function TaskList({
  tasks,
  dict,
  lang,
  onToggle,
  onDelete,
  onEdit,
  onClearCompleted,
}: {
  tasks: Task[];
  dict: Dict;
  lang: Language;
  onToggle: (task: Task) => void;
  onDelete: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onClearCompleted: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const sorted = useMemo(
    () =>
      [...tasks].sort(
        (a, b) => Number(a.isDone) - Number(b.isDone) || a.createdAt.localeCompare(b.createdAt),
      ),
    [tasks],
  );
  const visible = sorted.filter((task) =>
    filter === "all" ? true : filter === "active" ? !task.isDone : task.isDone,
  );
  const doneCount = tasks.filter((task) => task.isDone).length;
  const remaining = tasks.length - doneCount;
  const progress = tasks.length === 0 ? 0 : doneCount / tasks.length;

  const filters: { value: Filter; label: string; count: string }[] = [
    { value: "all", label: dict.task.filterAll, count: formatNumber(tasks.length, lang) },
    { value: "active", label: dict.task.filterActive, count: formatNumber(remaining, lang) },
    { value: "done", label: dict.task.filterDone, count: formatNumber(doneCount, lang) },
  ];

  const emptyIcon = tasks.length === 0 ? ListChecks : filter === "active" ? CircleCheck : ListFilter;
  const emptyMessage =
    tasks.length === 0 ? dict.task.empty : filter === "active" ? dict.task.emptyActive : dict.task.emptyDone;

  return (
    <div>
      {tasks.length > 0 ? (
        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold">
                {dict.task.progress.replace("{done}", formatNumber(doneCount, lang)).replace("{total}", formatNumber(tasks.length, lang))}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {remaining === 0 ? dict.home.allTasksDone : dict.home.tasksLeft.replace("{n}", formatNumber(remaining, lang))}
              </p>
            </div>
            <ProgressRing
              value={doneCount}
              max={tasks.length}
              size={48}
              stroke={5}
              label={`${formatNumber(Math.round(progress * 100), lang)}%`}
            />
          </div>

          <div
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={tasks.length}
            aria-label={dict.task.progress.replace("{done}", formatNumber(doneCount, lang)).replace("{total}", formatNumber(tasks.length, lang))}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <SegmentedControl
              options={filters}
              value={filter}
              onChange={setFilter}
              label={dict.task.title}
              className="w-full sm:w-auto"
            />
            {doneCount > 0 ? (
              <button
                type="button"
                onClick={onClearCompleted}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-bold text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30"
              >
                <Eraser size={13} aria-hidden="true" />
                {dict.task.clearCompleted}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState icon={emptyIcon} message={emptyMessage} />
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => (
            <li
              key={task.id}
              className={`group relative flex items-start gap-3 rounded-2xl border p-3 transition-all duration-150 ${
                task.isDone
                  ? "border-border/60 bg-pine/40"
                  : "border-border bg-card/70 hover:border-primary-light/50 hover:shadow-sm"
              }`}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={task.isDone}
                aria-label={
                  task.isDone
                    ? `${dict.task.markUndone}: ${task.title}`
                    : `${dict.task.markDone}: ${task.title}`
                }
                onClick={() => onToggle(task)}
                className={`mt-0.5 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border-2 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  task.isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:border-primary-light hover:bg-pine"
                }`}
              >
                {task.isDone ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : null}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`break-words text-sm font-semibold leading-snug ${
                    task.isDone ? "text-muted-foreground line-through decoration-muted-foreground/50" : ""
                  }`}
                >
                  {task.title}
                </p>
                {task.description ? (
                  <p
                    className={`mt-0.5 break-words text-xs leading-relaxed ${
                      task.isDone ? "text-muted-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {task.description}
                  </p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                  {task.isDone && task.completedAt ? (
                    <>
                      <CheckCheck size={12} aria-hidden="true" />
                      {dict.task.completedAt.replace("{time}", formatTime(task.completedAt, lang))}
                    </>
                  ) : (
                    <>
                      <Clock3 size={12} aria-hidden="true" />
                      {dict.task.addedAt.replace("{time}", formatTime(task.createdAt, lang))}
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                {onEdit ? (
                  <IconButton label={`${dict.task.edit}: ${task.title}`} onClick={() => onEdit(task)}>
                    <Pencil size={13} aria-hidden="true" />
                  </IconButton>
                ) : null}
                <IconButton
                  label={`${dict.task.del}: ${task.title}`}
                  variant="danger"
                  onClick={() => onDelete(task)}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
