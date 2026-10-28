"use client";

import { useAuth } from "@/lib/auth";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { ConnectionBanner } from "./ConnectionBanner";
import { AppSplashScreen } from "./AppSplashScreen";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Auth screens: fullscreen, no chrome
  if (!loading && !user) {
    return <div className="min-h-dvh">{children}</div>;
  }

  if (loading && !user) {
    return <AppSplashScreen />;
  }

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop drawer — permanent */}
      <aside className="no-print sticky top-0 hidden h-dvh w-72 shrink-0 border-e border-border bg-card/60 backdrop-blur-xl lg:block">
        <Sidebar />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <Header />
        <ConnectionBanner />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-32 lg:pb-12">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
