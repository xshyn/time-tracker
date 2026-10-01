"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { currentUser, signIn as beSignIn, signOut as beSignOut, signUp as beSignUp } from "@/lib/backend";
import type { User } from "@/lib/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setUser(await currentUser());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await beSignIn(email, password));
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    setUser(await beSignUp(email, password, displayName));
  }, []);

  const signOut = useCallback(async () => {
    await beSignOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, signIn, signUp, signOut, refresh }), [user, loading, signIn, signUp, signOut, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  return useContext(Ctx);
}

export function useRequireAuth(): { user: User | null; loading: boolean } {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!loading && !user) window.location.href = "/login";
  }, [loading, user]);
  return { user, loading };
}
