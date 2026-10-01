"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { useTheme, type Theme } from "@/lib/theme";
import { backendKind, migrateLocalToCloud, readLocalBackup, updateProfile, type LocalBackup } from "@/lib/backend";
import { Button, Card, Field, Input, Separator } from "@/components/ui";
import { LanguageMenu } from "@/components/LanguageMenu";
import { ArrowRight, Check, Monitor, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const { user, loading } = useRequireAuth();
  const { user: authUser, refresh } = useAuth();
  const { dict, lang } = useLang();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<LocalBackup>({ tasks: [], sessions: [] });
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    if (authUser) setDisplayName(authUser.displayName);
  }, [authUser]);

  useEffect(() => {
    try {
      setBackup(readLocalBackup());
    } catch {
      /* ignore */
    }
  }, []);

  if (loading || !user || !authUser) return <p className="py-10 text-center text-sm text-muted-foreground">{dict.common.loading}</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(authUser.id, { displayName: displayName.trim() || authUser.displayName, preferredLanguage: lang });
      try {
        localStorage.setItem("tt_lang", lang);
      } catch {
        /* ignore */
      }
      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-xl font-bold">{dict.settings.title}</h1>
      <Card>
        <h2 className="font-semibold">{dict.settings.profile}</h2>
        <form onSubmit={save} className="mt-4 space-y-5">
          <Field label={dict.settings.displayName}>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <Separator />
          <div className="space-y-2">
            <span className="block text-sm font-medium">{dict.settings.language}</span>
            <div className="flex">
              <LanguageMenu />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <span className="block text-sm font-medium">{dict.settings.theme}</span>
            <div role="radiogroup" aria-label={dict.settings.theme} className="grid grid-cols-3 gap-2">
              {(
                [
                  { value: "light", label: dict.settings.themeLight, Icon: Sun },
                  { value: "dark", label: dict.settings.themeDark, Icon: Moon },
                  { value: "system", label: dict.settings.themeSystem, Icon: Monitor },
                ] as const satisfies { value: Theme; label: string; Icon: typeof Sun }[]
              ).map(({ value, label, Icon }) => {
                const selected = theme === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTheme(value)}
                    className={`relative flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-all duration-150 ${
                      selected
                        ? "border-primary bg-pine text-foreground shadow-sm"
                        : "border-border bg-card text-muted-foreground hover:border-primary-light hover:text-foreground"
                    }`}
                  >
                    <Icon size={19} aria-hidden="true" className={selected ? "text-primary-light" : ""} />
                    {label}
                    {selected ? (
                      <span className="absolute -top-2 -end-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                        <Check size={12} strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={busy}>
              {dict.settings.save}
            </Button>
            {saved ? <span className="text-sm text-primary-light">{dict.settings.saved}</span> : null}
          </div>
        </form>
      </Card>
      {backendKind() === "supabase" ? (
        <Card>
          <h2 className="font-semibold">{dict.settings.syncTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{dict.settings.syncDesc}</p>
        <div className="mt-3">
          {backup.tasks.length === 0 && backup.sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.settings.syncEmpty}</p>
          ) : (
            <p className="text-sm font-medium">
              {dict.settings.syncFound
                .replace("{tasks}", String(backup.tasks.length))
                .replace("{sessions}", String(backup.sessions.length))}
            </p>
          )}
        </div>
        {syncDone ? <p className="mt-2 text-sm text-primary-light">{dict.settings.syncSuccess}</p> : null}
        {syncError ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {syncError}
          </p>
        ) : null}
        <div className="mt-3">
          <Button
            disabled={syncBusy || (backup.tasks.length === 0 && backup.sessions.length === 0)}
            onClick={async () => {
              setSyncBusy(true);
              setSyncError("");
              setSyncDone(false);
              try {
                await migrateLocalToCloud();
                setBackup({ tasks: [], sessions: [] });
                setSyncDone(true);
              } catch (err) {
                setSyncError(err instanceof Error ? err.message : dict.auth.errorInvalid);
              } finally {
                setSyncBusy(false);
              }
            }}
          >
            {syncBusy ? dict.common.loading : dict.settings.syncButton}
          </Button>
        </div>
      </Card>
      ) : null}
      <Card>
        <h2 className="font-semibold">
          {dict.settings.account} · {dict.settings.backend}
        </h2>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{authUser.email}</p>
          <Separator />
          <p className="text-sm text-muted-foreground">
            {backendKind() === "supabase" ? dict.settings.cloudBackend : dict.settings.localBackend}
          </p>
          <Separator />
          <Button
            variant="ghost"
            onClick={() => {
              router.push("/");
            }}
          >
            <span className="inline-flex items-center gap-1">
              {dict.nav.home}
              <ArrowRight size={15} aria-hidden="true" className="rtl:rotate-180" />
            </span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
