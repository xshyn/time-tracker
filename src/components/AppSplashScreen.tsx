"use client";

import { Clock3 } from "lucide-react";
import { useLang } from "@/lib/i18n/provider";

export function AppSplashScreen() {
  const { dict } = useLang();

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 text-foreground"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -start-28 -top-32 h-80 w-80 rounded-full bg-primary/8 blur-3xl" />
        <span className="absolute -bottom-36 -end-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <span className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-primary text-primary-foreground shadow-pop ring-1 ring-primary/10">
          <Clock3 size={36} strokeWidth={1.8} aria-hidden="true" />
          <span className="absolute -bottom-1 -end-1 h-5 w-5 rounded-full border-4 border-background bg-accent" aria-hidden="true" />
        </span>

        <h1 className="mt-6 text-xl font-extrabold tracking-tight sm:text-2xl">{dict.appName}</h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{dict.tagline}</p>

        <div className="mt-8 flex items-center gap-2.5 text-xs font-semibold text-muted-foreground">
          <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40 motion-reduce:animate-none" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          {dict.common.loading}
        </div>
      </div>
    </div>
  );
}
