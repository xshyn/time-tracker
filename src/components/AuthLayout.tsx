"use client";

import { CalendarDays, Clock3, TableProperties } from "lucide-react";
import { useLang } from "@/lib/i18n/provider";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeToggle } from "./ThemeToggle";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { dict } = useLang();

  return (
    <div className="grid min-h-dvh md:grid-cols-[1.05fr_1fr]">
      {/* Brand panel — banner on mobile, side panel on desktop */}
      <div className="relative overflow-hidden bg-primary text-white dark:bg-[#0c1712]">
        {/* timesheet ticks */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, transparent 0 31px, rgba(255,255,255,0.9) 31px 32px), repeating-linear-gradient(to bottom, transparent 0 31px, rgba(255,255,255,0.5) 31px 32px)",
          }}
        />
        <div aria-hidden="true" className="absolute -bottom-24 -end-24 h-72 w-72 rounded-full bg-accent/70 blur-2xl" />
        <div aria-hidden="true" className="absolute -top-20 -start-16 h-64 w-64 rounded-full bg-primary-light/50 blur-2xl" />
        {/* nocturnal atmosphere — dark mode only */}
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              "radial-gradient(28rem 20rem at 90% 100%, rgba(178, 90, 40, 0.28), transparent 65%), radial-gradient(30rem 22rem at 0% 0%, rgba(127, 191, 154, 0.12), transparent 60%)",
          }}
        />

        <div
          className="relative flex h-full flex-col justify-between gap-8 p-6 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:p-10 md:p-12"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                <Clock3 size={20} aria-hidden="true" />
              </span>
              <span className="text-base font-extrabold tracking-tight">{dict.appName}</span>
            </span>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageMenu compact />
            </div>
          </div>

          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />
              {dict.tagline}
            </p>
            <p className="max-w-md text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-[3.4rem]">
              08:30 – 17:45
            </p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
              {dict.auth.loginSub}
            </p>

            {/* punch stub */}
            <div className="mt-6 flex max-w-sm items-stretch gap-0 overflow-hidden rounded-2xl bg-card text-foreground shadow-pop">
              <div className="flex flex-1 flex-col justify-center px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent-dark">{dict.home.today}</span>
                <span className="text-lg font-extrabold tabular-nums">9h 15m</span>
              </div>
              <div aria-hidden="true" className="w-0.5 bg-border" />
              <div className="flex flex-1 flex-col justify-center px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary-light">{dict.home.tasks}</span>
                <span className="text-lg font-extrabold tabular-nums">6 / 8</span>
              </div>
              <div className="flex items-center bg-accent px-4 text-accent-foreground">
                <TableProperties size={20} aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-5 text-xs font-semibold text-white/70 md:flex">
            <span className="inline-flex items-center gap-1.5"><Clock3 size={13} aria-hidden="true" />{dict.home.sessions}</span>
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={13} aria-hidden="true" />{dict.nav.calendar}</span>
            <span className="inline-flex items-center gap-1.5"><TableProperties size={13} aria-hidden="true" />{dict.nav.report}</span>
          </div>
        </div>
      </div>

      {/* Form side — fullscreen on mobile */}
      <div className="flex flex-col bg-background">
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10 sm:py-14 md:px-8">
          {children}
        </main>
        <p className="px-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs text-muted-foreground">
          {dict.auth.forgot}
        </p>
      </div>
    </div>
  );
}
