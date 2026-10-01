"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Clock3, House, LogOut, Settings as SettingsIcon, TableProperties } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";
import { backendKind } from "@/lib/backend";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeToggle } from "./ThemeToggle";

export function Sidebar() {
  const { dict } = useLang();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/", label: dict.nav.home, Icon: House },
    { href: "/calendar", label: dict.nav.calendar, Icon: CalendarDays },
    { href: "/report", label: dict.nav.report, Icon: TableProperties },
    { href: "/settings", label: dict.nav.settings, Icon: SettingsIcon },
  ];

  return (
    <div className="flex h-full flex-col gap-5 p-5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-card">
          <Clock3 size={21} aria-hidden="true" />
          <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-accent" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-[15px] font-extrabold leading-tight">{dict.appName}</span>
          <span className="block text-xs text-muted-foreground">{dict.tagline}</span>
        </span>
      </div>

      <nav aria-label="primary" className="space-y-1">
        {links.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 ${
                active
                  ? "bg-primary text-primary-foreground shadow-card"
                  : "text-foreground/80 hover:bg-pine hover:text-foreground"
              }`}
            >
              <Icon size={18} aria-hidden="true" className={active ? "" : "text-primary-light"} />
              {label}
              {active ? <span className="ms-auto h-1.5 w-1.5 rounded-full bg-accent-light" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-border bg-card/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{dict.settings.language}</span>
            <LanguageMenu compact />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{dict.settings.theme}</span>
            <ThemeToggle />
          </div>
          {user ? (
            <p className="mt-2 truncate text-xs text-muted-foreground" title={user.email}>
              {user.displayName} · {backendKind() === "supabase" ? "☁" : "⌂"}
            </p>
          ) : null}
        </div>
        <button
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-card/70 px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
        >
          <LogOut size={16} aria-hidden="true" />
          {dict.nav.logout}
        </button>
      </div>
    </div>
  );
}
