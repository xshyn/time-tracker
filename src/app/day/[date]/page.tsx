"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  House,
  ListChecks,
  Plus,
  Repeat2,
  Timer,
} from "lucide-react";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import {
  deleteSession,
  deleteTask,
  getDayRemote,
  listSessions,
  listTasks,
  setDayRemote,
  updateSession,
  updateTask,
} from "@/lib/backend";
import {
  dayTotalMinutesAt,
  formatDateLong,
  formatMinutes,
  formatNumber,
  parseDateKey,
  toDateKey,
  todayKey,
} from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import type { Task, TimeSession } from "@/lib/types";
import { Badge, Button, Card, SectionHeading, Switch } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { TaskList } from "@/components/TaskList";
import { SessionForm } from "@/components/forms/SessionForm";
import { TaskForm } from "@/components/forms/TaskForm";

export default function DayPage() {
  const params = useParams<{ date: string }>();
  const dateKey = params.date;
  const { user, loading } = useRequireAuth();
  const { user: authUser } = useAuth();
  const { dict, lang, dir } = useLang();
  const router = useRouter();
  const now = useNow();

  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [dayRemote, setDayRemoteState] = useState(false);

  const reload = useCallback(async () => {
    if (!authUser) return;
    const [nextSessions, nextTasks, remoteFlag] = await Promise.all([
      listSessions(authUser.id, dateKey, dateKey),
      listTasks(authUser.id, dateKey, dateKey),
      getDayRemote(authUser.id, dateKey).catch(() => null),
    ]);
    setSessions(nextSessions);
    setTasks(nextTasks);
    if (remoteFlag !== null) setDayRemoteState(remoteFlag);
    else setDayRemoteState(nextSessions.length > 0 && nextSessions.every((session) => session.isRemote));
  }, [authUser, dateKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary/10 text-primary-light">
          <CalendarDays size={22} aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
      </div>
    );
  }

  const toggleTask = async (task: Task) => {
    if (!authUser) return;
    const isDone = !task.isDone;
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, isDone } : item)));
    await updateTask(task.id, authUser.id, {
      isDone,
      completedAt: isDone ? new Date().toISOString() : null,
    });
    await reload();
  };

  const removeTask = async (task: Task) => {
    if (!authUser || !confirm(dict.common.confirmDelete)) return;
    await deleteTask(task.id, authUser.id);
    await reload();
  };

  const removeSession = async (session: TimeSession) => {
    if (!authUser || !confirm(dict.common.confirmDelete)) return;
    await deleteSession(session.id, authUser.id);
    await reload();
  };

  const clearCompleted = async () => {
    if (!authUser) return;
    await Promise.all(tasks.filter((task) => task.isDone).map((task) => deleteTask(task.id, authUser.id)));
    await reload();
  };

  const total = dayTotalMinutesAt(sessions, now ?? 0);
  const prev = toDateKey(new Date(parseDateKey(dateKey).getTime() - 86_400_000));
  const next = toDateKey(new Date(parseDateKey(dateKey).getTime() + 86_400_000));
  const remoteCount = sessions.filter((session) => session.isRemote).length;
  const doneCount = tasks.filter((task) => task.isDone).length;
  const dayStatus =
    sessions.length === 0
      ? dayRemote
        ? dict.day.remote
        : dict.day.onsite
      : remoteCount === 0
        ? dict.day.onsite
        : remoteCount === sessions.length
          ? dict.day.remote
          : dict.day.hybrid;

  const toggleDayRemote = async () => {
    if (!authUser) return;
    const nextValue = !dayRemote;
    setDayRemoteState(nextValue);
    try {
      await setDayRemote(authUser.id, dateKey, nextValue);
      await Promise.all(sessions.map((session) => updateSession(session.id, authUser.id, { isRemote: nextValue })));
      await reload();
    } catch {
      /* offline / old schema — keep the local toggle */
    }
  };

  const closeForms = () => {
    setShowAddSession(false);
    setEditingSession(null);
  };

  const openAddSession = () => {
    setEditingSession(null);
    setShowAddSession((value) => !value);
  };

  const openEditSession = (session: TimeSession) => {
    setShowAddSession(false);
    setEditingSession(session);
  };

  const closeTaskForms = () => {
    setShowAddTask(false);
    setEditingTask(null);
  };

  const openAddTask = () => {
    setEditingTask(null);
    setShowAddTask((value) => !value);
  };

  const openEditTask = (task: Task) => {
    setShowAddTask(false);
    setEditingTask(task);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <CalendarDays size={12} className="text-primary-light" aria-hidden="true" />
            {dict.nav.calendar}
          </Link>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">{formatDateLong(dateKey, lang)}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="primary">
              <Timer size={12} aria-hidden="true" />
              {dict.day.total}: <span className="tabular-nums">{formatMinutes(total, lang)}</span>
            </Badge>
            <Badge tone="neutral">
              <Repeat2 size={12} aria-hidden="true" />
              {dict.session.count.replace("{n}", formatNumber(sessions.length, lang))}
            </Badge>
            <Badge tone={dayRemote ? "accent" : "outline"}>
              {dayRemote ? <House size={12} aria-hidden="true" /> : <Building2 size={12} aria-hidden="true" />}
              {dayStatus}
            </Badge>
            {tasks.length > 0 ? (
              <Badge tone="neutral">
                <ListChecks size={12} aria-hidden="true" />
                {formatNumber(doneCount, lang)}/{formatNumber(tasks.length, lang)}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Switch
            checked={dayRemote}
            onCheckedChange={toggleDayRemote}
            label={dict.day.remoteDay}
            icon={dayRemote ? House : Building2}
          />
          <nav
            aria-label={dict.calendar.title}
            className="flex items-center gap-1 rounded-xl border border-border bg-card/80 p-1 shadow-sm"
          >
            <Link
              href={`/day/${prev}`}
              aria-label={dict.report.prev}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-pine hover:text-foreground"
            >
              {dir === "rtl" ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronLeft size={16} aria-hidden="true" />}
            </Link>
            <Link
              href={`/day/${todayKey()}`}
              className="rounded-lg px-2 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:bg-pine hover:text-foreground"
            >
              {dict.home.today}
            </Link>
            <Link
              href={`/day/${next}`}
              aria-label={dict.report.next}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-pine hover:text-foreground"
            >
              {dir === "rtl" ? <ChevronLeft size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
            </Link>
          </nav>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <SectionHeading
            icon={Clock3}
            title={dict.day.sessions}
            action={
              <Button variant="secondary" size="sm" onClick={openAddSession}>
                <Plus size={14} aria-hidden="true" />
                {dict.session.add}
              </Button>
            }
          />
          <div className="mt-4">
            {showAddSession || editingSession ? (
              <SessionForm
                dateKey={dateKey}
                initial={editingSession}
                existing={sessions.filter((session) => session.id !== editingSession?.id)}
                defaultRemote={dayRemote}
                onCancel={closeForms}
                onSaved={async () => {
                  closeForms();
                  await reload();
                }}
              />
            ) : null}
            <SessionList
              sessions={sessions}
              lang={lang}
              dict={dict}
              onEdit={openEditSession}
              onDelete={removeSession}
            />
          </div>
        </Card>

        <Card>
          <SectionHeading
            icon={ListChecks}
            title={dict.day.tasks}
            action={
              <Button variant="secondary" size="sm" onClick={openAddTask}>
                <Plus size={14} aria-hidden="true" />
                {dict.task.add}
              </Button>
            }
          />
          <div className="mt-4">
            {showAddTask || editingTask ? (
              <TaskForm
                dateKey={dateKey}
                initial={editingTask}
                onCancel={closeTaskForms}
                onSaved={async () => {
                  closeTaskForms();
                  await reload();
                }}
              />
            ) : null}
            <TaskList
              tasks={tasks}
              dict={dict}
              lang={lang}
              onToggle={toggleTask}
              onDelete={removeTask}
              onEdit={openEditTask}
              onClearCompleted={clearCompleted}
            />
          </div>
        </Card>
      </div>

      <Link
        href="/calendar"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-light transition-colors hover:text-primary-dark"
      >
        {dict.calendar.title}
        <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
      </Link>
    </div>
  );
}
