import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

function normalizeSupabaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  let url = raw.trim().replace(/\/+$/, "");
  // Common copy-paste mistake: pasting the REST endpoint
  // https://xxx.supabase.co/rest/v1/ instead of https://xxx.supabase.co.
  // supabase-js appends /rest/v1 and /auth/v1 itself, so strip it.
  url = url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) && !/^https?:\/\/.+/.test(url)) return null;
  return url || null;
}

export function getSupabaseUrl(): string | null {
  return normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL is missing — using local-storage backend. Set it in Netlify env vars and redeploy.");
    }
    return null;
  }
  if (cached) return cached;
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const url = getSupabaseUrl() as string;
  if (typeof window !== "undefined" && raw.trim().replace(/\/+$/, "") !== url) {
    console.warn(`[supabase] Normalized NEXT_PUBLIC_SUPABASE_URL from ${raw} to ${url}`);
  }
  cached = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);
  return cached;
}
