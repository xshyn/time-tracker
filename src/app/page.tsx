"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Play, SquarePlus, Square } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { createSession, createTask, deleteTask, listSessions, listTasks, updateSession, updateTask } from "@/lib/backend";
import { dayTotalMinutes, formatMinutes, formatTime, overlaps, todayKey } from "@/lib/dates";
import type { Task, TimeSession } from "@/lib/types";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { TaskList } from "@/components/TaskList";

export default function HomePage() {
  const { user, loading } = useAuth();
  const { dict, lang } = useLang();
  const router = useRouter();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const dateKey = todayKey();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const reload = async (uid: string) => {
    const [s, t] = await Promise.all([listSessions(uid, dateKey, dateKey), listTasks(uid, dateKey, dateKey)]);
    setSessions(s);
    setTasks(t);
  };

  useEffect(() => {
    if (user) void reload(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading || !user) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const open = sessions.find((s) => !s.checkOutAt);
  const total = dayTotalMinutes(sessions);

  const checkIn = async () => {
    setBusy(true);
    try {
      const now = new Date();
      const iso = now.toISOString();
      if (overlaps({ checkInAt: iso, checkOutAt: null }, sessions)) return;
      await createSession({ userId: user.id, date: dateKey, checkInAt: iso, checkOutAt: null });
      await reload(user.id);
    } finally {
      setBusy(false);
    }
  };

  const checkOut = async () => {
    if (!open) return;
    setBusy(true);
    try {
      await updateSession(open.id, user.id, { checkOutAt: new Date().toISOString() });
      await reload(user.id);
    } finally {
      setBusy(false);
    }
  };

  const addTask = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!quickTitle.trim()) return;
    setBusy(true);
    try {
      await createTask({ userId: user.id, date: dateKey, title: quickTitle.trim() });
      setQuickTitle("");
      await reload(user.id);
    } finally {
      setBusy(false);
    }
  };

  const toggleTask = async (t: Task) => {
    const isDone = !t.isDone;
    // optimistic update for instant feedback
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, isDone } : x)));
    await updateTask(t.id, user.id, { isDone, completedAt: isDone ? new Date().toISOString() : null });
    await reload(user.id);
  };

  const removeTask = async (t: Task) => {
    if (!confirm(dict.common.confirmDelete)) return;
    await deleteTask(t.id, user.id);
    await reload(user.id);
  };

  const clearCompleted = async () => {
    await Promise.all(tasks.filter((t) => t.isDone).map((t) => deleteTask(t.id, user.id)));
    await reload(user.id);
  };

  const now = new Date();
  const ym = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{dict.home.today}</p>
            <h1 className="text-2xl font-bold">
              {now.toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </h1>
            <p className="mt-1 text-sm">
              {open ? (
                <>
                  {dict.home.statusIn} <strong>{formatTime(open.checkInAt, lang)}</strong> <Badge>{dict.home.openSession}</Badge>
                </>
              ) : (
                dict.home.statusOut
              )}{" "}
              · {dict.home.totalToday}: <strong>{formatMinutes(total)}</strong>
            </p>
          </div>
          <div className="flex gap-2">
            {open ? (
              <Button onClick={checkOut} disabled={busy} variant="primary">
                <Square size={16} aria-hidden="true" /> {dict.home.checkOut}
              </Button>
            ) : (
              <Button onClick={checkIn} disabled={busy} variant="primary">
                <Play size={16} aria-hidden="true" /> {dict.home.checkIn}
              </Button>
            )}
            <Link href={`/day/${dateKey}`} className="inline-flex items-center rounded-lg bg-muted px-4 py-2 text-sm font-semibold hover:bg-border">
              {dict.home.viewDay}
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">{dict.home.sessions}</h2>
          {sessions.length === 0 ? (
            <EmptyState message={dict.home.noSessions} />
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {formatTime(s.checkInAt, lang)} – {s.checkOutAt ? formatTime(s.checkOutAt, lang) : dict.session.open}
                    {s.note ? <span className="ms-2 text-muted-foreground">· {s.note}</span> : null}
                  </span>
                  <Badge>{formatMinutes(dayTotalMinutes([s]))}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">{dict.home.tasks}</h2>
          <form onSubmit={addTask} className="mb-3 flex gap-2">
            <Input
              aria-label={dict.task.title}
              placeholder={dict.task.quickPlaceholder}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
            <Button type="submit" disabled={busy || !quickTitle.trim()} variant="secondary" aria-label={dict.home.addTask}>
              <SquarePlus size={16} aria-hidden="true" />
            </Button>
          </form>
          <TaskList tasks={tasks} dict={dict} onToggle={toggleTask} onDelete={removeTask} onClearCompleted={clearCompleted} />
        </Card>
      </div>

      <Card>
        <Link href={`/report/${ym}`} className="inline-flex items-center gap-1 font-semibold text-primary-light hover:underline">
          {dict.home.quickReport}
          <ArrowRight size={15} aria-hidden="true" className="rtl:rotate-180" />
        </Link>
      </Card>
    </div>
  );
}
