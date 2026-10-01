"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { useLang } from "@/lib/i18n/provider";
import { backendKind } from "@/lib/backend";
import { getSupabase } from "@/lib/supabase";

/**
 * Visible database-status banner. Shown only when the cloud backend is
 * configured but unreachable — instead of failing silently, the user is
 * told something is wrong until they're back online.
 */
export function ConnectionBanner() {
  const { dict } = useLang();
  const [down, setDown] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) {
      setDown(false);
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setDown(true);
      return;
    }
    setChecking(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const { error } = await sb.from("profiles").select("id").limit(1).abortSignal(ctrl.signal);
      clearTimeout(t);
      setDown(!!error);
    } catch {
      setDown(true);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (backendKind() !== "supabase") return;
    void check();
    const onOffline = () => setDown(true);
    const onOnline = () => void check();
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, 30000);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      clearInterval(id);
    };
  }, [check]);

  if (backendKind() !== "supabase" || !down) return null;

  return (
    <div className="no-print px-4 pt-3">
      <div
        role="alert"
        className="mx-auto flex max-w-5xl items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-sm font-medium text-destructive lg:max-w-none"
      >
        <TriangleAlert size={16} aria-hidden="true" className="shrink-0" />
        <span className="flex-1">{dict.common.offline}</span>
        <button
          type="button"
          onClick={() => void check()}
          disabled={checking}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-destructive/40 px-2.5 py-1 text-xs font-bold transition-colors hover:bg-destructive hover:text-white disabled:opacity-50"
        >
          <RefreshCw size={13} aria-hidden="true" className={checking ? "animate-spin" : ""} />
          {checking ? dict.common.loading : dict.common.retry}
        </button>
      </div>
    </div>
  );
}
