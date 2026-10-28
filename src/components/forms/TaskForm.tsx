"use client";

import { useState } from "react";
import { Check, ListPlus, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { createTask, updateTask } from "@/lib/backend";
import type { Task } from "@/lib/types";
import { Button, Field, IconButton, Input, TextArea } from "@/components/ui";

export function TaskForm({
  dateKey,
  initial,
  onCancel,
  onSaved,
}: {
  dateKey: string;
  initial: Task | null;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const { user } = useAuth();
  const { dict } = useLang();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [busy, setBusy] = useState(false);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !title.trim()) return;
    setBusy(true);
    try {
      if (initial) {
        await updateTask(initial.id, user.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
      } else {
        await createTask({
          userId: user.id,
          date: dateKey,
          title: title.trim(),
          description: description.trim() || undefined,
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
            <ListPlus size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold">{initial ? dict.task.edit : dict.task.add}</p>
            <p className="text-xs text-muted-foreground">{dict.task.placeholderTitle}</p>
          </div>
        </div>
        <IconButton label={dict.common.close} onClick={onCancel}>
          <X size={16} aria-hidden="true" />
        </IconButton>
      </div>

      <Field label={dict.task.title}>
        <Input
          required
          autoFocus
          value={title}
          placeholder={dict.task.placeholderTitle}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>
      <Field label={dict.task.description}>
        <TextArea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !title.trim()}>
          <Check size={15} aria-hidden="true" />
          {dict.task.save}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X size={15} aria-hidden="true" />
          {dict.task.cancel}
        </Button>
      </div>
    </form>
  );
}
