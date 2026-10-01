import { getSupabase, isSupabaseConfigured } from "./supabase";
import { uid } from "./dates";
import type { Language, Task, TimeSession, User } from "./types";

// ---------- local (built-in) backend ----------

interface LocalUserRow {
  id: string;
  email: string;
  passHash: string;
  salt: string;
  displayName: string;
  preferredLanguage: Language;
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — ignore */
  }
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ---------- public backend API (contract first) ----------

export async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    const authUser = data.user;
    if (!authUser) throw new Error("Sign-up failed");
    const user: User = {
      id: authUser.id,
      email,
      displayName: displayName || email.split("@")[0]!,
      preferredLanguage: "en",
    };
    await sb.from("profiles").upsert({
      id: authUser.id,
      display_name: user.displayName,
      preferred_language: "en",
    });
    return user;
  }
  // local backend
  if (password.length < 6) throw new Error("WEAK_PASSWORD");
  const users = lsGet<LocalUserRow[]>("tt_users", []);
  const norm = normalizeEmail(email);
  if (users.some((u) => u.email === norm)) throw new Error("EMAIL_EXISTS");
  const salt = uid("salt");
  const passHash = await sha256Hex(salt + password);
  const row: LocalUserRow = {
    id: uid("user"),
    email: norm,
    passHash,
    salt,
    displayName: displayName || norm.split("@")[0]!,
    preferredLanguage: (localStorage.getItem("tt_lang") as Language) || "en",
  };
  users.push(row);
  lsSet("tt_users", users);
  lsSet("tt_session", row.id);
  return toUser(row);
}

export async function signIn(email: string, password: string): Promise<User> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return await fetchSupabaseProfile(sb, data.user.id, data.user.email ?? email);
  }
  const users = lsGet<LocalUserRow[]>("tt_users", []);
  const norm = normalizeEmail(email);
  const row = users.find((u) => u.email === norm);
  if (!row) throw new Error("INVALID_CREDENTIALS");
  const hash = await sha256Hex(row.salt + password);
  if (hash !== row.passHash) throw new Error("INVALID_CREDENTIALS");
  lsSet("tt_session", row.id);
  return toUser(row);
}

export async function signOut(): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.auth.signOut();
  try {
    localStorage.removeItem("tt_session");
  } catch {
    /* ignore */
  }
}

export async function currentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    return await fetchSupabaseProfile(sb, data.user.id, data.user.email ?? "");
  }
  const sessionId = safeGet("tt_session");
  if (!sessionId) return null;
  const users = lsGet<LocalUserRow[]>("tt_users", []);
  const row = users.find((u) => u.id === sessionId);
  return row ? toUser(row) : null;
}

export async function updateProfile(userId: string, patch: { displayName?: string; preferredLanguage?: Language }): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    await sb.from("profiles").upsert({
      id: userId,
      display_name: patch.displayName,
      preferred_language: patch.preferredLanguage,
    });
    return;
  }
  const users = lsGet<LocalUserRow[]>("tt_users", []);
  const next = users.map((u) =>
    u.id === userId
      ? {
          ...u,
          displayName: patch.displayName ?? u.displayName,
          preferredLanguage: patch.preferredLanguage ?? u.preferredLanguage,
        }
      : u,
  );
  lsSet("tt_users", next);
}

// ---------- sessions ----------

export async function listSessions(userId: string, fromKey?: string, toKey?: string): Promise<TimeSession[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("time_sessions").select("*").eq("user_id", userId).order("check_in_at", { ascending: true });
    if (fromKey) q = q.gte("date", fromKey);
    if (toKey) q = q.lte("date", toKey);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      date: String(r.date),
      checkInAt: String(r.check_in_at),
      checkOutAt: r.check_out_at ? String(r.check_out_at) : null,
      note: (r.note as string | null) ?? undefined,
      isRemote: Boolean((r as Record<string, unknown>).is_remote ?? false),
    }));
  }
  const all = lsGet<TimeSession[]>("tt_sessions", []).filter((s) => s.userId === userId);
  return all
    .filter((s) => (!fromKey || s.date >= fromKey) && (!toKey || s.date <= toKey))
    .map((s) => ({ ...s, isRemote: s.isRemote ?? false }))
    .sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));
}

export async function createSession(input: Omit<TimeSession, "id" | "userId"> & { userId: string }): Promise<TimeSession> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("time_sessions")
      .insert({
        user_id: input.userId,
        date: input.date,
        check_in_at: input.checkInAt,
        check_out_at: input.checkOutAt,
        note: input.note ?? null,
        is_remote: input.isRemote ?? false,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: String(data.id),
      userId: String(data.user_id),
      date: String(data.date),
      checkInAt: String(data.check_in_at),
      checkOutAt: data.check_out_at ? String(data.check_out_at) : null,
      note: (data.note as string | null) ?? undefined,
      isRemote: Boolean((data as Record<string, unknown>).is_remote ?? false),
    };
  }
  const row: TimeSession = { ...input, isRemote: input.isRemote ?? false, id: uid("sess") };
  const all = lsGet<TimeSession[]>("tt_sessions", []);
  all.push(row);
  lsSet("tt_sessions", all);
  return row;
}

export async function updateSession(id: string, userId: string, patch: Partial<Pick<TimeSession, "date" | "checkInAt" | "checkOutAt" | "note" | "isRemote">>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    // Only send provided fields — a missing key must not overwrite stored data.
    const update: Record<string, unknown> = {};
    if (patch.date !== undefined) update.date = patch.date;
    if (patch.checkInAt !== undefined) update.check_in_at = patch.checkInAt;
    if (patch.checkOutAt !== undefined) update.check_out_at = patch.checkOutAt;
    if (patch.note !== undefined) update.note = patch.note;
    if (patch.isRemote !== undefined) update.is_remote = patch.isRemote;
    const { error } = await sb.from("time_sessions").update(update).eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }
  const all = lsGet<TimeSession[]>("tt_sessions", []);
  lsSet(
    "tt_sessions",
    all.map((s) => (s.id === id && s.userId === userId ? { ...s, ...patch } : s)),
  );
}

export async function deleteSession(id: string, userId: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("time_sessions").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }
  const all = lsGet<TimeSession[]>("tt_sessions", []);
  lsSet(
    "tt_sessions",
    all.filter((s) => !(s.id === id && s.userId === userId)),
  );
}

// ---------- day remote defaults (one toggle per date) ----------

function localDayRemoteMap(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem("tt_day_remote");
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

/** Day-level remote default for a single date. Null = never set (treat as onsite). */
export async function getDayRemote(userId: string, date: string): Promise<boolean | null> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from("day_flags").select("is_remote").eq("user_id", userId).eq("date", date).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return Boolean((data as Record<string, unknown>).is_remote);
  }
  const map = localDayRemoteMap();
  return date in map ? Boolean(map[date]) : null;
}

/** Bulk fetch day remote defaults for a range (calendar/report). Missing dates = not remote. */
export async function listDayRemotes(userId: string, fromKey?: string, toKey?: string): Promise<Record<string, boolean>> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("day_flags").select("date,is_remote").eq("user_id", userId);
    if (fromKey) q = q.gte("date", fromKey);
    if (toKey) q = q.lte("date", toKey);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const out: Record<string, boolean> = {};
    for (const r of data ?? []) {
      const d = String((r as Record<string, unknown>).date);
      if (!fromKey || d >= fromKey) {
        if (!toKey || d <= toKey) out[d] = Boolean((r as Record<string, unknown>).is_remote);
      }
    }
    return out;
  }
  const map = localDayRemoteMap();
  const out: Record<string, boolean> = {};
  for (const [d, v] of Object.entries(map)) {
    if ((!fromKey || d >= fromKey) && (!toKey || d <= toKey) && v) out[d] = true;
  }
  return out;
}

export async function setDayRemote(userId: string, date: string, isRemote: boolean): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("day_flags").upsert({ user_id: userId, date, is_remote: isRemote });
    if (error) throw new Error(error.message);
    return;
  }
  try {
    const map = localDayRemoteMap();
    map[date] = isRemote;
    localStorage.setItem("tt_day_remote", JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

// ---------- tasks ----------

export async function listTasks(userId: string, fromKey?: string, toKey?: string): Promise<Task[]> {
  const sb = getSupabase();
  if (sb) {
    let q = sb.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: true });
    if (fromKey) q = q.gte("date", fromKey);
    if (toKey) q = q.lte("date", toKey);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: String(r.id),
      userId: String(r.user_id),
      date: String(r.date),
      title: String(r.title),
      description: (r.description as string | null) ?? undefined,
      isDone: Boolean(r.is_done ?? false),
      completedAt: (r.completed_at as string | null) ?? null,
      createdAt: String(r.created_at),
    }));
  }
  const all = lsGet<Task[]>("tt_tasks", []).filter((t) => t.userId === userId);
  return all
    .filter((t) => (!fromKey || t.date >= fromKey) && (!toKey || t.date <= toKey))
    .map((t) => ({ ...t, isDone: t.isDone ?? false }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createTask(input: Omit<Task, "id" | "userId" | "createdAt" | "isDone" | "completedAt"> & { userId: string }): Promise<Task> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("tasks")
      .insert({ user_id: input.userId, date: input.date, title: input.title, description: input.description ?? null, is_done: false })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      id: String(data.id),
      userId: String(data.user_id),
      date: String(data.date),
      title: String(data.title),
      description: (data.description as string | null) ?? undefined,
      isDone: Boolean(data.is_done ?? false),
      completedAt: (data.completed_at as string | null) ?? null,
      createdAt: String(data.created_at),
    };
  }
  const row: Task = { ...input, id: uid("task"), isDone: false, completedAt: null, createdAt: new Date().toISOString() };
  const all = lsGet<Task[]>("tt_tasks", []);
  all.push(row);
  lsSet("tt_tasks", all);
  return row;
}

export async function updateTask(id: string, userId: string, patch: Partial<Pick<Task, "title" | "description" | "date" | "isDone" | "completedAt">>): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    // Only send provided fields — a missing key must not overwrite stored data.
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.date !== undefined) update.date = patch.date;
    if (patch.isDone !== undefined) update.is_done = patch.isDone;
    if (patch.completedAt !== undefined) update.completed_at = patch.completedAt;
    const { error } = await sb.from("tasks").update(update).eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }
  const all = lsGet<Task[]>("tt_tasks", []);
  lsSet(
    "tt_tasks",
    all.map((t) => (t.id === id && t.userId === userId ? { ...t, ...patch } : t)),
  );
}

export async function deleteTask(id: string, userId: string): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from("tasks").delete().eq("id", id).eq("user_id", userId);
    if (error) throw new Error(error.message);
    return;
  }
  const all = lsGet<Task[]>("tt_tasks", []);
  lsSet(
    "tt_tasks",
    all.filter((t) => !(t.id === id && t.userId === userId)),
  );
}

// ---------- local → cloud migration ----------

export interface LocalBackup {
  tasks: Task[];
  sessions: TimeSession[];
  displayName?: string;
  preferredLanguage?: Language;
}

const LOCAL_DATA_KEYS = ["tt_tasks", "tt_sessions", "tt_users", "tt_session", "tt_day_remote"] as const;

function readKey<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function chunks<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/** Read this browser's local-backend data without touching the cloud. */
export function readLocalBackup(): LocalBackup {
  if (typeof window === "undefined") return { tasks: [], sessions: [] };
  const tasks = readKey<Task[]>("tt_tasks", []);
  const sessions = readKey<TimeSession[]>("tt_sessions", []);
  const sessionId = readKey<string | null>("tt_session", null);
  let displayName: string | undefined;
  let preferredLanguage: Language | undefined;
  if (sessionId) {
    const me = readKey<LocalUserRow[]>("tt_users", []).find((u) => u.id === sessionId);
    if (me) {
      displayName = me.displayName;
      preferredLanguage = me.preferredLanguage;
    }
  }
  return { tasks, sessions, displayName, preferredLanguage };
}

/**
 * Upload this browser's local data to the signed-in Supabase account,
 * then remove the local copies. Local keys are only cleared after every
 * insert succeeds — a failed migration keeps local data intact.
 */
export async function migrateLocalToCloud(): Promise<{ tasks: number; sessions: number }> {
  const sb = getSupabase();
  if (!sb) throw new Error("NO_CLOUD");
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("NOT_SIGNED_IN");
  const backup = readLocalBackup();

  for (const chunk of chunks(backup.tasks, 500)) {
    const { error } = await sb.from("tasks").insert(
      chunk.map((t) => ({
        user_id: user.id,
        date: t.date,
        title: t.title,
        description: t.description ?? null,
        is_done: t.isDone ?? false,
        completed_at: t.completedAt ?? null,
        created_at: t.createdAt,
      })),
    );
    if (error) throw new Error(error.message);
  }

  for (const chunk of chunks(backup.sessions, 500)) {
    const { error } = await sb.from("time_sessions").insert(
      chunk.map((s) => ({
        user_id: user.id,
        date: s.date,
        check_in_at: s.checkInAt,
        check_out_at: s.checkOutAt ?? null,
        note: s.note ?? null,
        is_remote: s.isRemote ?? false,
      })),
    );
    if (error) throw new Error(error.message);
  }

  // Migrate day remote defaults (best effort — skip if table missing on old deploys).
  try {
    const dayMap = localDayRemoteMap();
    const entries = Object.entries(dayMap);
    for (const chunk of chunks(entries, 500)) {
      const { error } = await sb.from("day_flags").upsert(
        chunk.map(([date, isRemote]) => ({ user_id: user.id, date, is_remote: Boolean(isRemote) })),
      );
      if (error) throw new Error(error.message);
    }
  } catch {
    /* old schema without day_flags — sessions already migrated above */
  }

  if (backup.displayName || backup.preferredLanguage) {
    const profile: Record<string, unknown> = { id: user.id };
    if (backup.displayName) profile.display_name = backup.displayName;
    if (backup.preferredLanguage) profile.preferred_language = backup.preferredLanguage;
    const { error } = await sb.from("profiles").upsert(profile);
    if (error) throw new Error(error.message);
  }

  try {
    for (const k of LOCAL_DATA_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
  return { tasks: backup.tasks.length, sessions: backup.sessions.length };
}

// ---------- helpers ----------

function toUser(row: LocalUserRow): User {
  return { id: row.id, email: row.email, displayName: row.displayName, preferredLanguage: row.preferredLanguage };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function fetchSupabaseProfile(sb: ReturnType<typeof getSupabase> & {}, userId: string, email: string): Promise<User> {
  const { data } = await sb.from("profiles").select("*").eq("id", userId).single();
  return {
    id: userId,
    email,
    displayName: (data?.display_name as string) || email.split("@")[0]!,
    preferredLanguage: (data?.preferred_language as Language) || "en",
  };
}

export function backendKind(): "supabase" | "local" {
  return isSupabaseConfigured() ? "supabase" : "local";
}
