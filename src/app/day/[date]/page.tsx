"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import {
  createSession,
  createTask,
  deleteSession,
  deleteTask,
  listSessions,
  listTasks,
  updateSession,
  updateTask,
} from "@/lib/backend";
import { dayTotalMinutes, formatDateLong, formatMinutes, formatTime, overlaps, parseDateKey, toDateKey } from "@/lib/dates";
import type { Task, TimeSession } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Field, Input, TextArea } from "@/components/ui";
import { TaskList } from "@/components/TaskList";

function localTimeToIso(dateKey: string, hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = parseDateKey(dateKey);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

function isoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DayPage() {
  const params = useParams<{ date: string }>();
  const dateKey = params.date;
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const { dict, lang, dir } = useLang();
  const router = useRouter();

  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);

  const reload = useCallback(async () => {
    if (!authUser) return;
    const [s, t] = await Promise.all([listSessions(authUser.id, dateKey, dateKey), listTasks(authUser.id, dateKey, dateKey)]);
    setSessions(s);
    setTasks(t);
  }, [authUser, dateKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading || !user) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const toggleTask = async (t: Task) => {
    if (!authUser) return;
    const isDone = !t.isDone;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, isDone } : x)));
    await updateTask(t.id, authUser.id, { isDone, completedAt: isDone ? new Date().toISOString() : null });
    await reload();
  };

  const removeTask = async (t: Task) => {
    if (!authUser || !confirm(dict.common.confirmDelete)) return;
    await deleteTask(t.id, authUser.id);
    await reload();
  };

  const clearCompleted = async () => {
    if (!authUser) return;
    await Promise.all(tasks.filter((t) => t.isDone).map((t) => deleteTask(t.id, authUser.id)));
    await reload();
  };

  const total = dayTotalMinutes(sessions);
  const prev = toDateKey(new Date(parseDateKey(dateKey).getTime() - 86400000));
  const next = toDateKey(new Date(parseDateKey(dateKey).getTime() + 86400000));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{formatDateLong(dateKey, lang)}</h1>
          <p className="text-sm text-muted-foreground">
            {dict.day.total}: <strong>{formatMinutes(total)}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/day/${prev}`}
            aria-label={dict.report.prev}
            className="rounded-lg bg-muted p-2 text-foreground transition-colors hover:bg-border"
          >
            {dir === "rtl" ? <ChevronRight size={17} aria-hidden="true" /> : <ChevronLeft size={17} aria-hidden="true" />}
          </Link>
          <Link
            href={`/day/${next}`}
            aria-label={dict.report.next}
            className="rounded-lg bg-muted p-2 text-foreground transition-colors hover:bg-border"
          >
            {dir === "rtl" ? <ChevronLeft size={17} aria-hidden="true" /> : <ChevronRight size={17} aria-hidden="true" />}
          </Link>
        </div>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{dict.day.sessions}</h2>
          <Button variant="secondary" onClick={() => setShowAddSession((v) => !v)}>
            {dict.session.add}
          </Button>
        </div>
        {showAddSession ? (
          <SessionForm
            dateKey={dateKey}
            initial={null}
            existing={sessions}
            onCancel={() => setShowAddSession(false)}
            onSaved={async () => {
              setShowAddSession(false);
              await reload();
            }}
          />
        ) : null}
        {sessions.length === 0 ? (
          <EmptyState message={dict.home.noSessions} />
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="py-2 text-sm">
                {editingSession?.id === s.id ? (
                  <SessionForm
                    dateKey={dateKey}
                    initial={s}
                    existing={sessions.filter((x) => x.id !== s.id)}
                    onCancel={() => setEditingSession(null)}
                    onSaved={async () => {
                      setEditingSession(null);
                      await reload();
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {formatTime(s.checkInAt, lang)} – {s.checkOutAt ? formatTime(s.checkOutAt, lang) : dict.session.open}
                      {s.note ? <span className="ms-2 text-muted-foreground">· {s.note}</span> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge>{formatMinutes(dayTotalMinutes([s]))}</Badge>
                      <button className="cursor-pointer text-primary-light hover:underline" onClick={() => setEditingSession(s)}>
                        {dict.session.edit}
                      </button>
                      <button
                        className="cursor-pointer text-destructive hover:underline"
                        onClick={async () => {
                          if (!authUser || !confirm(dict.common.confirmDelete)) return;
                          await deleteSession(s.id, authUser.id);
                          await reload();
                        }}
                      >
                        {dict.session.del}
                      </button>
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">{dict.day.tasks}</h2>
          <Button variant="secondary" onClick={() => setShowAddTask((v) => !v)}>
            {dict.task.add}
          </Button>
        </div>
        {showAddTask ? (
          <TaskForm
            initial={null}
            onCancel={() => setShowAddTask(false)}
            onSaved={async () => {
              setShowAddTask(false);
              await reload();
            }}
          />
        ) : null}
        {editingTask ? (
          <TaskForm
            initial={editingTask}
            onCancel={() => setEditingTask(null)}
            onSaved={async () => {
              setEditingTask(null);
              await reload();
            }}
          />
        ) : null}
        <TaskList
          tasks={tasks}
          dict={dict}
          onToggle={toggleTask}
          onDelete={removeTask}
          onEdit={setEditingTask}
          onClearCompleted={clearCompleted}
        />
      </Card>

      <button className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-primary-light hover:underline" onClick={() => router.push("/calendar")}>
        {dict.calendar.title}
        <ArrowRight size={15} aria-hidden="true" className="rtl:rotate-180" />
      </button>
    </div>
  );
}

function SessionForm({
  dateKey,
  initial,
  existing,
  onCancel,
  onSaved,
}: {
  dateKey: string;
  initial: TimeSession | null;
  existing: TimeSession[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { dict } = useLang();
  const [checkIn, setCheckIn] = useState(initial ? isoToLocalTime(initial.checkInAt) : "09:00");
  const [checkOut, setCheckOut] = useState(initial?.checkOutAt ? isoToLocalTime(initial.checkOutAt) : "17:00");
  const [openEnded, setOpenEnded] = useState(initial ? !initial.checkOutAt : false);
  const [note, setNote] = useState(initial?.note ?? "");
  const [warn, setWarn] = useState(false);
  const [rangeError, setRangeError] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const checkInAt = localTimeToIso(dateKey, checkIn);
      const checkOutAt = openEnded ? null : localTimeToIso(dateKey, checkOut);
      if (checkOutAt && checkOutAt <= checkInAt) {
        setRangeError(true);
        setWarn(false);
        return;
      }
      setRangeError(false);
      const hit = overlaps({ checkInAt, checkOutAt }, existing);
      setWarn(hit);
      if (initial) {
        await updateSession(initial.id, user.id, { date: dateKey, checkInAt, checkOutAt, note: note || undefined });
      } else {
        await createSession({ userId: user.id, date: dateKey, checkInAt, checkOutAt, note: note || undefined });
      }
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mb-3 space-y-2 rounded-xl border border-border bg-card p-3 backdrop-blur-md">
      <div className="grid grid-cols-2 gap-2">
        <Field label={dict.session.checkIn}>
          <Input type="time" required value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </Field>
        <Field label={dict.session.checkOut}>
          <Input type="time" required={!openEnded} disabled={openEnded} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </Field>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={openEnded} onChange={(e) => setOpenEnded(e.target.checked)} />
        {dict.session.open}
      </label>
      <Field label={dict.session.note}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {rangeError ? (
        <p role="alert" className="text-sm text-destructive">
          {dict.session.invalidRange}
        </p>
      ) : null}
      {warn ? (
        <p role="alert" className="text-sm text-accent-dark">
          {dict.session.overlapWarn}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {dict.session.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {dict.session.cancel}
        </Button>
      </div>
    </form>
  );
}

function TaskForm({ initial, onCancel, onSaved }: { initial: Task | null; onCancel: () => void; onSaved: () => Promise<void> }) {
  const params = useParams<{ date: string }>();
  const { user } = useAuth();
  const { dict } = useLang();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [busy, setBusy] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      if (initial) {
        await updateTask(initial.id, user.id, { title: title.trim(), description: description.trim() || undefined });
      } else {
        await createTask({ userId: user.id, date: params.date, title: title.trim(), description: description.trim() || undefined });
      }
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="mb-3 space-y-2 rounded-xl border border-border bg-card p-3 backdrop-blur-md">
      <Field label={dict.task.title}>
        <Input required value={title} placeholder={dict.task.placeholderTitle} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label={dict.task.description}>
        <TextArea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !title.trim()}>
          {dict.task.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {dict.task.cancel}
        </Button>
      </div>
    </form>
  );
}
