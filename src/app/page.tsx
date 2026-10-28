"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Clock3,
  House,
  ListChecks,
  ListPlus,
  Play,
  Plus,
  Repeat2,
  Square,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import {
  createSession,
  createTask,
  deleteTask,
  getDayRemote,
  listSessions,
  listTasks,
  updateSession,
  updateTask,
} from "@/lib/backend";
import {
  dayTotalMinutesAt,
  formatMinutes,
  formatNumber,
  formatTime,
  overlaps,
  parseDateKey,
  todayKey,
} from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import { toJalaali } from "@/lib/jalali";
import type { Task, TimeSession } from "@/lib/types";
import { Badge, Button, Card, Input, ProgressRing, SectionHeading, StatTile } from "@/components/ui";
import { SessionList } from "@/components/SessionList";
import { TaskList } from "@/components/TaskList";
import { SessionForm } from "@/components/forms/SessionForm";

const DAILY_GOAL_MINUTES = 8 * 60;

export default function HomePage() {
  const { user, loading } = useAuth();
  const { dict, lang } = useLang();
  const router = useRouter();
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [editingSession, setEditingSession] = useState<TimeSession | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [todayRemote, setTodayRemote] = useState(false);
  const dateKey = todayKey();
  const now = useNow(1_000);
  const nowDate = now ? new Date(now) : null;

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  const reload = async (uid: string) => {
    const [nextSessions, nextTasks, remoteFlag] = await Promise.all([
      listSessions(uid, dateKey, dateKey),
      listTasks(uid, dateKey, dateKey),
      getDayRemote(uid, dateKey).catch(() => null),
    ]);
    setSessions(nextSessions);
    setTasks(nextTasks);
    if (remoteFlag !== null) setTodayRemote(remoteFlag);
    else setTodayRemote(nextSessions.length > 0 && nextSessions.every((session) => session.isRemote));
  };

  useEffect(() => {
    if (user) void reload(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-2xl bg-primary/10 text-primary-light">
          <Clock3 size={22} aria-hidden="true" />
        </span>
        <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
      </div>
    );
  }

  const open = sessions.find((session) => !session.checkOutAt);
  const total = dayTotalMinutesAt(sessions, now ?? 0);
  const doneCount = tasks.filter((task) => task.isDone).length;
  const remaining = tasks.length - doneCount;
  const taskProgress = tasks.length === 0 ? 0 : doneCount / tasks.length;
  const remoteCount = sessions.filter((session) => session.isRemote).length;
  const hasRemoteSession = sessions.length === 0 ? todayRemote : remoteCount > 0;
  const dayStatus =
    sessions.length === 0
      ? todayRemote
        ? dict.day.remote
        : dict.day.onsite
      : remoteCount === 0
        ? dict.day.onsite
        : remoteCount === sessions.length
          ? dict.day.remote
          : dict.day.hybrid;
  const today = parseDateKey(dateKey);
  const reportMonth = lang === "fa"
    ? (() => {
        const { jy, jm } = toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
        return `${jy}/${String(jm).padStart(2, "0")}`;
      })()
    : dateKey.slice(0, 7).replace("-", "/");
  const dateLabel = today.toLocaleDateString(lang === "fa" ? "fa-IR" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const clock = nowDate
    ? nowDate.toLocaleTimeString(lang === "fa" ? "fa-IR" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
    : "--:--";

  const checkIn = async () => {
    setBusy(true);
    try {
      const iso = new Date().toISOString();
      if (overlaps({ checkInAt: iso, checkOutAt: null }, sessions)) return;
      await createSession({
        userId: user.id,
        date: dateKey,
        checkInAt: iso,
        checkOutAt: null,
        isRemote: todayRemote,
      });
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

  const addTask = async (event?: React.FormEvent) => {
    event?.preventDefault();
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

  const toggleTask = async (task: Task) => {
    const isDone = !task.isDone;
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, isDone } : item)));
    await updateTask(task.id, user.id, {
      isDone,
      completedAt: isDone ? new Date().toISOString() : null,
    });
    await reload(user.id);
  };

  const removeTask = async (task: Task) => {
    if (!confirm(dict.common.confirmDelete)) return;
    await deleteTask(task.id, user.id);
    await reload(user.id);
  };

  const clearCompleted = async () => {
    await Promise.all(tasks.filter((task) => task.isDone).map((task) => deleteTask(task.id, user.id)));
    await reload(user.id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-dark dark:text-accent-light">
            {dict.home.today}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{dateLabel}</h1>
        </div>
        <Link
          href={`/day/${dateKey}`}
          className="hidden items-center gap-2 rounded-xl border border-border bg-card/70 px-3.5 py-2 text-sm font-bold text-foreground shadow-sm transition-colors hover:border-primary-light/60 hover:bg-pine sm:inline-flex"
        >
          <CalendarDays size={15} className="text-primary-light" aria-hidden="true" />
          {dict.home.viewDay}
          <ArrowRight size={14} className="rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-primary p-3 text-primary-foreground shadow-pop dark:bg-[#13231b] sm:rounded-3xl sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, transparent 0 31px, rgba(255,255,255,0.9) 31px 32px), repeating-linear-gradient(to bottom, transparent 0 31px, rgba(255,255,255,0.55) 31px 32px)",
          }}
        />
        <div aria-hidden="true" className="absolute -end-16 -top-20 h-64 w-64 rounded-full bg-accent/40 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -start-20 h-56 w-56 rounded-full bg-primary-light/30 blur-3xl" />
        <Clock3
          size={220}
          strokeWidth={0.7}
          aria-hidden="true"
          className="pointer-events-none absolute -end-8 -top-14 text-white/[0.045]"
        />

        <div className="relative grid grid-cols-[minmax(0,1fr)_6.5rem] items-center gap-x-3 gap-y-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-8 sm:gap-y-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/20">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                {open ? (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-light opacity-75" />
                ) : null}
                <span className={`relative inline-flex h-2 w-2 rounded-full ${open ? "bg-accent-light" : "bg-white/60"}`} />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                {open ? dict.home.openSession : dict.home.today}
              </span>
            </div>

            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/45 sm:mt-4 sm:text-[10px] sm:tracking-[0.2em]">{dict.home.localTime}</p>
            <p className="mt-1 text-[2.5rem] font-extrabold leading-none tabular-nums tracking-tight sm:text-6xl">{clock}</p>

            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/75 sm:mt-3 sm:text-sm">
              {open ? (
                <>
                  <Play size={13} fill="currentColor" aria-hidden="true" />
                  {dict.home.statusIn} <strong className="font-bold text-white">{formatTime(open.checkInAt, lang)}</strong>
                </>
              ) : (
                dict.home.statusOut
              )}
            </p>

          </div>

          <div className="flex flex-col items-center gap-2 sm:row-span-2 sm:justify-center sm:gap-2">
            <ProgressRing
              value={total}
              max={DAILY_GOAL_MINUTES}
              size={96}
              stroke={8}
              label={formatMinutes(total, lang)}
              caption={`${dict.home.goal} ${formatMinutes(DAILY_GOAL_MINUTES, lang)}`}
              tone="hero"
              className="sm:hidden"
            />
            <ProgressRing
              value={total}
              max={DAILY_GOAL_MINUTES}
              size={128}
              stroke={10}
              label={formatMinutes(total, lang)}
              caption={`${dict.home.goal} ${formatMinutes(DAILY_GOAL_MINUTES, lang)}`}
              tone="hero"
              className="hidden sm:inline-flex"
            />
            <Badge tone="accent" className="max-w-full border-white/15 bg-white/10 px-2 text-[10px] text-white sm:mt-1 sm:px-2.5 sm:text-[11px]">
              {hasRemoteSession ? <House size={12} aria-hidden="true" /> : <Building2 size={12} aria-hidden="true" />}
              {dayStatus}
            </Badge>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:col-start-1 sm:row-start-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
            {open ? (
              <Button variant="accent" size="lg" className="h-12 min-w-0 px-2.5 text-xs sm:h-auto sm:px-5 sm:text-[15px]" onClick={checkOut} disabled={busy}>
                <Square size={16} fill="currentColor" aria-hidden="true" />
                <span className="truncate">{dict.home.checkOut}</span>
              </Button>
            ) : (
              <Button variant="accent" size="lg" className="h-12 min-w-0 px-2.5 text-xs sm:h-auto sm:px-5 sm:text-[15px]" onClick={checkIn} disabled={busy}>
                <Play size={16} fill="currentColor" aria-hidden="true" />
                <span className="truncate">{dict.home.checkIn}</span>
              </Button>
            )}
            <Link
              href={`/day/${dateKey}`}
              className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-2.5 text-xs font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:h-[46px] sm:px-4 sm:text-sm"
            >
              <CalendarDays size={16} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{dict.home.viewDay}</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        <StatTile
          icon={Repeat2}
          label={dict.home.sessions}
          value={formatNumber(sessions.length, lang)}
          hint={open ? dict.home.openSession : dict.home.sessionsCount.replace("{n}", formatNumber(sessions.length, lang))}
          tone="accent"
        />
        <StatTile
          icon={ListChecks}
          label={dict.home.tasks}
          value={`${formatNumber(doneCount, lang)}/${formatNumber(tasks.length, lang)}`}
          hint={
            tasks.length === 0
              ? dict.home.noTasks
              : remaining === 0
                ? dict.home.allTasksDone
                : dict.home.tasksLeft.replace("{n}", formatNumber(remaining, lang))
          }
          tone="neutral"
          progress={taskProgress}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <Card className="flex flex-col">
          <SectionHeading
            icon={Clock3}
            title={dict.home.sessions}
            action={
              <Link
                href={`/day/${dateKey}`}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-primary-light transition-colors hover:bg-pine"
              >
                {dict.home.viewDay}
                <ArrowRight size={13} className="rtl:rotate-180" aria-hidden="true" />
              </Link>
            }
          />
          <div className="mt-3 flex-1">
            {editingSession ? (
              <SessionForm
                key={editingSession.id}
                dateKey={dateKey}
                initial={editingSession}
                existing={sessions.filter((session) => session.id !== editingSession.id)}
                defaultRemote={todayRemote}
                onCancel={() => setEditingSession(null)}
                onSaved={async () => {
                  setEditingSession(null);
                  await reload(user.id);
                }}
              />
            ) : null}
            <SessionList sessions={sessions} lang={lang} dict={dict} onEdit={setEditingSession} />
          </div>
        </Card>

        <Card>
          <SectionHeading
            icon={ListChecks}
            title={dict.home.tasks}
            action={
              <Badge tone="primary">
                {formatNumber(doneCount, lang)}/{formatNumber(tasks.length, lang)}
              </Badge>
            }
          />
          <form onSubmit={addTask} className="mt-4 flex gap-2">
            <div className="relative min-w-0 flex-1">
              <ListPlus
                size={16}
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label={dict.task.title}
                placeholder={dict.task.quickPlaceholder}
                value={quickTitle}
                onChange={(event) => setQuickTitle(event.target.value)}
                className="ps-9"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              aria-label={dict.home.addTask}
              disabled={busy || !quickTitle.trim()}
            >
              <Plus size={18} aria-hidden="true" />
            </Button>
          </form>
          <div className="mt-4">
            <TaskList
              tasks={tasks}
              dict={dict}
              lang={lang}
              onToggle={toggleTask}
              onDelete={removeTask}
              onClearCompleted={clearCompleted}
            />
          </div>
        </Card>
      </div>

      <Link
        href={`/report/${reportMonth}`}
        className="glass group flex items-center gap-4 rounded-2xl p-4 transition-all duration-150 hover:border-primary-light/50 hover:shadow-pop sm:rounded-3xl sm:p-5"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent-dark ring-1 ring-accent/10 dark:text-accent-light">
          <BarChart3 size={20} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{dict.home.quickReport}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">{dict.home.reportHint}</span>
        </span>
        <ArrowRight
          size={17}
          aria-hidden="true"
          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
        />
      </Link>
    </div>
  );
}
