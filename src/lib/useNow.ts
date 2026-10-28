"use client";

import { useEffect, useState } from "react";

/**
 * A client-only clock. Returns null during the server render so live time and
 * open-session durations never cause a hydration mismatch.
 */
export function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
