"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, Settings as SettingsIcon, TableProperties } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/i18n/provider";

export function BottomNav() {
  const { dict } = useLang();
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const links = [
    { href: "/", label: dict.nav.home, Icon: House },
    { href: "/calendar", label: dict.nav.calendar, Icon: CalendarDays },
    { href: "/report", label: dict.nav.report, Icon: TableProperties },
    { href: "/settings", label: dict.nav.settings, Icon: SettingsIcon },
  ];

  return (
    <nav
      aria-label="primary"
      className="no-print fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <div className="glass-strong mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl p-1.5">
        {links.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
                active ? "bg-primary text-primary-foreground shadow-card" : "text-muted-foreground hover:bg-pine hover:text-foreground"
              }`}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
