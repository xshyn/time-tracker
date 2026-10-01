"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Language } from "@/lib/types";
import { en, type Dict } from "@/lib/i18n/en";
import { fa } from "@/lib/i18n/fa";

interface LangCtx {
  lang: Language;
  dict: Dict;
  dir: "ltr" | "rtl";
  setLang: (l: Language) => void;
}

const Ctx = createContext<LangCtx>({ lang: "en", dict: en, dir: "ltr", setLang: () => {} });

const KEY = "tt_lang";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = (localStorage.getItem(KEY) as Language | null) ?? null;
      if (saved === "en" || saved === "fa") setLangState(saved);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const setLang = useCallback((l: Language) => setLangState(l), []);
  const value = useMemo<LangCtx>(
    () => ({ lang, dict: lang === "fa" ? fa : en, dir: lang === "fa" ? "rtl" : "ltr", setLang }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}
