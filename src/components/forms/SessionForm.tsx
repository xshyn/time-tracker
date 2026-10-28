"use client";

import { useState } from "react";
import { Check, Clock3, House, TriangleAlert, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { createSession, updateSession } from "@/lib/backend";
import { overlaps, parseDateKey } from "@/lib/dates";
import type { TimeSession } from "@/lib/types";
import { Button, Field, IconButton, Input, Switch } from "@/components/ui";

function localTimeToIso(dateKey: string, hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const date = parseDateKey(dateKey);
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date.toISOString();
}

function isoToLocalTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function SessionForm({
  dateKey,
  initial,
  existing,
  defaultRemote,
  onCancel,
  onSaved,
}: {
  dateKey: string;
  initial: TimeSession | null;
  existing: TimeSession[];
  defaultRemote: boolean;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { dict } = useLang();
  const [checkIn, setCheckIn] = useState(initial ? isoToLocalTime(initial.checkInAt) : "09:00");
  const [checkOut, setCheckOut] = useState(initial?.checkOutAt ? isoToLocalTime(initial.checkOutAt) : "17:00");
  const [openEnded, setOpenEnded] = useState(initial ? !initial.checkOutAt : false);
  const [note, setNote] = useState(initial?.note ?? "");
  const [isRemote, setIsRemote] = useState(initial ? Boolean(initial.isRemote) : defaultRemote);
  const [warn, setWarn] = useState(false);
  const [rangeError, setRangeError] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
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
        await updateSession(initial.id, user.id, {
          date: dateKey,
          checkInAt,
          checkOutAt,
          note: note || undefined,
          isRemote,
        });
      } else {
        await createSession({
          userId: user.id,
          date: dateKey,
          checkInAt,
          checkOutAt,
          note: note || undefined,
          isRemote,
        });
      }
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={save}
      className="mb-4 space-y-4 rounded-2xl border border-primary/20 bg-pine/40 p-4 shadow-inner"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary-light shadow-sm ring-1 ring-border/70">
            <Clock3 size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold">{initial ? dict.session.edit : dict.session.add}</p>
            <p className="text-xs text-muted-foreground">{dict.session.manualTitle}</p>
          </div>
        </div>
        <IconButton label={dict.common.close} onClick={onCancel}>
          <X size={16} aria-hidden="true" />
        </IconButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={dict.session.checkIn}>
          <Input type="time" required value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
        </Field>
        <Field label={dict.session.checkOut}>
          <Input
            type="time"
            required={!openEnded}
            disabled={openEnded}
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-2">
        <Switch checked={openEnded} onCheckedChange={setOpenEnded} label={dict.session.open} />
        <Switch checked={isRemote} onCheckedChange={setIsRemote} label={dict.session.remote} icon={House} />
      </div>

      <Field label={dict.session.note}>
        <Input value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>

      {rangeError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {dict.session.invalidRange}
        </p>
      ) : null}
      {warn ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm font-medium text-accent-dark dark:text-accent-light"
        >
          <TriangleAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
          {dict.session.overlapWarn}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>
          <Check size={15} aria-hidden="true" />
          {dict.session.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X size={15} aria-hidden="true" />
          {dict.session.cancel}
        </Button>
      </div>
    </form>
  );
}
