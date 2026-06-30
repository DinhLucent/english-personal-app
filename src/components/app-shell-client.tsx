"use client";

import { useSyncExternalStore, ReactNode } from "react";
import { CheckCircle2, KeyRound, Rocket, UserRound, ChevronLeft, ChevronRight } from "lucide-react";
import { AppNav, MobileNav } from "@/components/app-nav";
import { MotionProvider } from "@/components/motion-provider";
import { SoundToggle } from "@/components/sound-toggle";
import { Badge, cn } from "@/components/ui";

const sidebarCollapsedKey = "speakflow:sidebar-collapsed";
const sidebarCollapsedEvent = "speakflow:sidebar-collapsed-change";

function getSidebarCollapsedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(sidebarCollapsedKey) === "true";
}

function subscribeToSidebarCollapsedChange(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(sidebarCollapsedEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(sidebarCollapsedEvent, onStoreChange);
  };
}

function StatusIndicator({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <Badge
      tone={ready ? "brand" : "coral"}
      className="bg-panel"
      icon={
        <span className="relative flex h-1.5 w-1.5">
          {ready ? (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
          ) : null}
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", ready ? "bg-brand" : "bg-coral")} />
        </span>
      }
    >
      {label}
    </Badge>
  );
}

function ShellSignal() {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Badge tone="brand" icon={<CheckCircle2 size={13} />}>
        30-day coach
      </Badge>
      <span className="hidden truncate text-sm font-medium text-muted md:block">
        Mission-first workspace
      </span>
    </div>
  );
}

function ServiceStatusGroup({
  supabaseReady,
  aiReady,
}: {
  supabaseReady: boolean;
  aiReady: boolean;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <StatusIndicator label="DB" ready={supabaseReady} />
      <StatusIndicator label="AI" ready={aiReady} />
      <SoundToggle />
    </div>
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
      "rounded-panel border border-line/60 bg-panel transition-all duration-[var(--motion-component)]",
      collapsed ? "flex justify-center p-2" : "p-3"
    )}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-panel-muted text-brand">
          <UserRound size={18} />
        </div>
        {!collapsed && (
          <div className="min-w-0 animate-fadeIn">
            <p className="truncate text-sm font-semibold">
              {email ?? (supabaseReady ? "Personal workspace" : "Local preview")}
            </p>
            <p className="text-xs text-muted-soft">
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
  const collapsed = useSyncExternalStore(
    subscribeToSidebarCollapsedChange,
    getSidebarCollapsedSnapshot,
    () => false,
  );

  const toggleCollapse = () => {
    const nextState = !collapsed;
    localStorage.setItem(sidebarCollapsedKey, String(nextState));
    window.dispatchEvent(new Event(sidebarCollapsedEvent));
  };

  return (
    <div className="min-h-screen bg-background">
      <MotionProvider />
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 lg:flex-row lg:px-6">
        
        {/* Sidebar */}
        <aside className={cn(
          "relative hidden shrink-0 border-r border-line/60 pr-5 transition-all duration-[var(--motion-component)] ease-in-out lg:block",
          collapsed ? "w-18" : "w-72"
        )}>
          <div className="sticky top-6 flex flex-col h-[calc(100vh-3rem)]">
            
            {/* Logo area */}
            <div className="mb-7 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  data-motion="brand-mark"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand text-white shadow-sm shadow-brand/10"
                >
                  <Rocket size={22} aria-hidden="true" />
                </div>
                {!collapsed && (
                  <div className="min-w-0 animate-fadeIn">
                    <p className="text-lg font-semibold truncate">SpeakFlow AI</p>
                    <p className="text-xs font-medium text-muted-soft">30-day coach</p>
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
              className="absolute -right-[12px] top-8 z-10 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-line bg-panel text-muted-soft shadow-xs transition-all duration-[var(--motion-fast)] hover:scale-105 hover:text-brand hover:shadow-md active:scale-95"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          data-app-main
          className={cn(
            "min-w-0 flex-1 transition-all duration-[var(--motion-component)] ease-in-out",
            collapsed ? "lg:pl-8" : "lg:pl-6"
          )}
        >
          <div className="mb-4 flex flex-col gap-3">
            <MobileNav />
            
            {/* Top Bar Status Panel */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-panel border border-line/60 bg-panel px-3 py-2.5 shadow-control sm:px-4">
              <ShellSignal />
              <ServiceStatusGroup supabaseReady={supabaseReady} aiReady={aiReady} />
            </div>

            {/* Mobile-only User Panel */}
            <div className="lg:hidden">
              <UserPanel email={userEmail} supabaseReady={supabaseReady} collapsed={false} />
            </div>

            {/* Warning banner */}
            {!supabaseReady || !aiReady ? (
              <div className="rounded-panel border border-danger-line bg-danger-surface px-4 py-3 text-sm leading-6 text-danger-text shadow-2xs">
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
