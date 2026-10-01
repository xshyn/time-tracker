"use client";

import { useRouter } from "next/navigation";
import { Clock3, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const { dict } = useLang();
  const { user, signOut } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <header
      className="no-print sticky top-0 z-40 px-4 lg:hidden"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="glass mx-auto flex max-w-5xl items-center gap-2 rounded-2xl px-3 py-2.5 lg:max-w-none lg:rounded-none lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
        <span className="flex flex-1 items-center gap-2 text-base font-bold lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
            <Clock3 size={18} aria-hidden="true" />
          </span>
          <span className="hidden min-[400px]:inline">{dict.appName}</span>
        </span>
        <span className="hidden flex-1 text-sm text-muted-foreground lg:block">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </span>
        <ThemeToggle />
        <LanguageMenu />
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          aria-label={dict.nav.logout}
          title={dict.nav.logout}
          className="cursor-pointer rounded-xl border border-border bg-card/80 p-2 text-muted-foreground shadow-sm transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
