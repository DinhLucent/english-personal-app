import type { ReactNode } from "react";
import { CheckCircle2, KeyRound, LogOut, Rocket, UserRound } from "lucide-react";
import { appConfig, hasAiConfig, hasSupabaseConfig } from "@/lib/config";
import { AppNav, MobileNav } from "@/components/app-nav";
import { cn } from "@/components/ui";
import { getCurrentUser } from "@/lib/supabase/server";

function StatusPill({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
        ready
          ? "border-[#b9d8ca] bg-[#e7f4ed] text-brand-strong"
          : "border-[#f0c7bd] bg-[#fff0ed] text-coral",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", ready ? "bg-brand" : "bg-coral")} />
      {label}
    </span>
  );
}

function UserPanel({
  email,
  supabaseReady,
}: {
  email: string | null;
  supabaseReady: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-line bg-panel p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-panel-muted text-brand">
          <UserRound size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {email ?? (supabaseReady ? "Not signed in" : "Local preview")}
          </p>
          <p className="text-xs text-[#66716c]">
            {email ? "Supabase session active" : "Auth pending"}
          </p>
        </div>
      </div>
      {email ? (
        <form action="/auth/sign-out" method="post" className="mt-3">
          <button className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-line bg-white px-3 text-sm font-semibold transition hover:border-coral hover:text-coral">
            <LogOut size={16} />
            Sign out
          </button>
        </form>
      ) : null}
    </div>
  );
}

export async function AppShell({ children }: { children: ReactNode }) {
  const supabaseReady = hasSupabaseConfig();
  const aiReady = hasAiConfig();
  const { user } = await getCurrentUser();
  const userEmail = user?.email ?? null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-0 lg:px-6">
        <aside className="hidden w-72 shrink-0 border-r border-line pr-5 lg:block">
          <div className="sticky top-6">
            <div className="mb-7">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] bg-brand text-white">
                  <Rocket size={22} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{appConfig.name}</p>
                  <p className="text-xs font-medium text-[#66716c]">30-day coach</p>
                </div>
              </div>
            </div>
            <AppNav />
            <div className="mt-8 grid gap-2">
              <StatusPill label="Supabase" ready={supabaseReady} />
              <StatusPill label="DeepSeek" ready={aiReady} />
            </div>
            <div className="mt-4">
              <UserPanel email={userEmail} supabaseReady={supabaseReady} />
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:pl-6">
          <div className="mb-4 flex flex-col gap-3">
            <MobileNav />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-line bg-panel px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-[#56635d]">
                <CheckCircle2 size={17} className="text-brand" />
                Build target: MVP first, expandable later
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Supabase" ready={supabaseReady} />
                <StatusPill label="DeepSeek" ready={aiReady} />
              </div>
            </div>
            <div className="lg:hidden">
              <UserPanel email={userEmail} supabaseReady={supabaseReady} />
            </div>
            {!supabaseReady || !aiReady ? (
              <div className="rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] px-4 py-3 text-sm leading-6 text-[#7b3f34]">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <KeyRound size={16} /> External services not fully connected.
                </span>{" "}
                The UI is ready, but cloud auth/storage and AI calls need environment variables before this can be considered complete.
              </div>
            ) : null}
          </div>
          <div className="pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
