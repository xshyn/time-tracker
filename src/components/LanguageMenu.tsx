"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLang } from "@/lib/i18n/provider";
import type { Language } from "@/lib/types";

export function LanguageMenu({ compact = false }: { compact?: boolean }) {
  const { dict, lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  const pick = (l: Language) => {
    setLang(l);
    setOpen(false);
  };

  const label = lang === "fa" ? dict.settings.persian : dict.settings.english;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={dict.settings.language}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card/80 py-2 pe-2 ps-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary-light hover:bg-card"
      >
        <Languages size={15} aria-hidden="true" className="text-primary-light" />
        {!compact ? <span>{label}</span> : <span className="sr-only">{label}</span>}
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div
          role="listbox"
          aria-label={dict.settings.language}
          className="absolute end-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-pop"
        >
          {(
            [
              { value: "en", label: dict.settings.english },
              { value: "fa", label: dict.settings.persian },
            ] as const
          ).map((o) => {
            const selected = lang === o.value;
            return (
              <button
                key={o.value}
                role="option"
                aria-selected={selected}
                onClick={() => pick(o.value)}
                className={`m-1 flex w-[calc(100%-0.5rem)] cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-foreground hover:bg-pine"
                }`}
              >
                {o.label}
                {selected ? <Check size={14} aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
