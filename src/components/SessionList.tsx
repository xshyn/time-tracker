"use client";

import { ArrowRight, Building2, Check, Clock3, House, MessageSquare, Pencil, Trash2 } from "lucide-react";
import type { Dict } from "@/lib/i18n/en";
import type { Language, TimeSession } from "@/lib/types";
import { formatMinutes, formatTime, sessionMinutesAt } from "@/lib/dates";
import { useNow } from "@/lib/useNow";
import { Badge, EmptyState, IconButton } from "./ui";

export function SessionList({
  sessions,
  lang,
  dict,
  onEdit,
  onDelete,
  emptyMessage,
  emptyTitle,
  emptyAction,
  className = "",
}: {
  sessions: TimeSession[];
  lang: Language;
  dict: Dict;
  onEdit?: (session: TimeSession) => void;
  onDelete?: (session: TimeSession) => void;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyAction?: React.ReactNode;
  className?: string;
}) {
  const now = useNow();

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={Clock3}
        title={emptyTitle}
        message={emptyMessage ?? dict.home.noSessions}
        action={emptyAction}
      />
    );
  }

  return (
    <div className={`relative ${className}`}>
      <span
        aria-hidden="true"
        className="absolute bottom-6 start-5 top-6 w-px bg-gradient-to-b from-border via-border to-transparent"
      />
      <ol className="relative">
        {sessions.map((session) => {
          const open = !session.checkOutAt;
          const minutes = sessionMinutesAt(session, now ?? 0);
          const hasActions = Boolean(onEdit || onDelete);

          return (
            <li
              key={session.id}
              className="group relative flex gap-3 rounded-2xl py-2 pe-1 ps-1 transition-colors duration-150 hover:bg-pine/50"
            >
              <span
                className={`relative z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-sm ${
                  open
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-border bg-card text-primary-light"
                }`}
              >
                {open ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
                ) : (
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-bold tabular-nums tracking-tight">{formatTime(session.checkInAt, lang)}</span>
                  <ArrowRight size={13} className="shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden="true" />
                  <span
                    className={`text-sm font-bold tabular-nums tracking-tight ${
                      open ? "text-accent-dark dark:text-accent-light" : ""
                    }`}
                  >
                    {session.checkOutAt ? formatTime(session.checkOutAt, lang) : dict.session.open}
                  </span>
                  <Badge tone="neutral" className="ms-auto tabular-nums">
                    {open && now === null ? "—" : formatMinutes(minutes, lang)}
                  </Badge>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {session.isRemote ? (
                        <House size={12} aria-hidden="true" />
                      ) : (
                        <Building2 size={12} aria-hidden="true" />
                      )}
                      {session.isRemote ? dict.session.remote : dict.day.onsite}
                    </span>
                    {session.note ? (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <MessageSquare size={12} className="shrink-0" aria-hidden="true" />
                        <span className="truncate">{session.note}</span>
                      </span>
                    ) : null}
                  </div>

                  {hasActions ? (
                    <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                      {onEdit ? (
                        <IconButton label={`${dict.session.edit}: ${formatTime(session.checkInAt, lang)}`} onClick={() => onEdit(session)}>
                          <Pencil size={13} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                      {onDelete ? (
                        <IconButton
                          label={`${dict.session.del}: ${formatTime(session.checkInAt, lang)}`}
                          variant="danger"
                          onClick={() => onDelete(session)}
                        >
                          <Trash2 size={13} aria-hidden="true" />
                        </IconButton>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
