"use client";

import { useState, useEffect, ReactNode } from "react";
import { CheckCircle2, KeyRound, Rocket, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { AppNav, MobileNav } from "@/components/app-nav";
import { cn } from "@/components/ui";

function StatusIndicator({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#56635d] border border-line/60 bg-panel px-2.5 py-1 rounded-full shadow-2xs transition-all duration-300">
      <span className="relative flex h-1.5 w-1.5">
        {ready && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
        )}
        <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", ready ? "bg-brand" : "bg-coral")} />
      </span>
      {label}
    </span>
  );
}

function UserPanel({
  email,
  supabaseReady,
  collapsed,
}: {
  email: string | null;
  supabaseReady: boolean;
  collapsed: boolean;
}) {
  return (
    <div className={cn(
      "rounded-[8px] border border-line/60 bg-panel transition-all duration-300",
      collapsed ? "flex justify-center p-2" : "p-3"
    )}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-panel-muted text-brand">
          <UserRound size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fadeIn">
            <p className="truncate text-sm font-semibold">
              {email ?? (supabaseReady ? "Personal workspace" : "Local preview")}
            </p>
            <p className="text-xs text-[#66716c]">
              {supabaseReady ? "Personal mode" : "Storage offline"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShellClient({
  children,
  supabaseReady,
  aiReady,
  userEmail,
}: {
  children: ReactNode;
  supabaseReady: boolean;
  aiReady: boolean;
  userEmail: string | null;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Read collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("speakflow:sidebar-collapsed");
    if (saved) {
      setCollapsed(saved === "true");
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem("speakflow:sidebar-collapsed", String(nextState));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 lg:flex-row lg:px-6">
        
        {/* Sidebar */}
        <aside className={cn(
          "hidden shrink-0 border-r border-line/60 pr-5 lg:block transition-all duration-300 ease-in-out relative",
          collapsed ? "w-18" : "w-72"
        )}>
          <div className="sticky top-6 flex flex-col h-[calc(100vh-3rem)]">
            
            {/* Logo area */}
            <div className="mb-7 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-brand text-white shadow-sm shadow-brand/10">
                  <Rocket size={22} aria-hidden="true" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 animate-fadeIn">
                    <p className="text-lg font-semibold truncate">SpeakFlow AI</p>
                    <p className="text-xs font-medium text-[#66716c]">30-day coach</p>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation links */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <AppNav collapsed={collapsed} />
            </div>

            {/* Sidebar footer / User panel */}
            <div className="mt-auto pt-4 shrink-0 space-y-4">
              <UserPanel email={userEmail} supabaseReady={supabaseReady} collapsed={collapsed} />
            </div>

            {/* Toggle collapse button */}
            <button
              onClick={toggleCollapse}
              className="absolute -right-[12px] top-8 flex h-6 w-6 items-center justify-center rounded-full border border-line bg-panel text-[#66716c] shadow-xs hover:text-brand hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer z-10"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className={cn(
          "min-w-0 flex-1 transition-all duration-300 ease-in-out",
          collapsed ? "lg:pl-8" : "lg:pl-6"
        )}>
          <div className="mb-4 flex flex-col gap-3">
            <MobileNav />
            
            {/* Top Bar Status Panel */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-line/60 bg-panel px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="flex items-center gap-2 text-sm font-medium text-[#56635d]">
                <CheckCircle2 size={17} className="text-brand" />
                Build target: MVP first, expandable later
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusIndicator label="Supabase" ready={supabaseReady} />
                <StatusIndicator label="DeepSeek" ready={aiReady} />
              </div>
            </div>

            {/* Mobile-only User Panel */}
            <div className="lg:hidden">
              <UserPanel email={userEmail} supabaseReady={supabaseReady} collapsed={false} />
            </div>

            {/* Warning banner */}
            {!supabaseReady || !aiReady ? (
              <div className="rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] px-4 py-3 text-sm leading-6 text-[#7b3f34] shadow-2xs">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <KeyRound size={16} /> External services not fully connected.
                </span>{" "}
                The UI is ready, but Supabase admin storage and AI calls need environment variables before this can be considered complete.
              </div>
            ) : null}
          </div>
          <div className="pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
