import type { ReactNode } from "react";
import { hasAiConfig, hasSupabaseAppConfig } from "@/lib/config";
import { getCurrentUser } from "@/lib/supabase/server";
import { AppShellClient } from "./app-shell-client";

export async function AppShell({ children }: { children: ReactNode }) {
  const supabaseReady = hasSupabaseAppConfig();
  const aiReady = hasAiConfig();
  const { user } = await getCurrentUser();
  const userEmail = user?.email ?? null;

  return (
    <AppShellClient
      supabaseReady={supabaseReady}
      aiReady={aiReady}
      userEmail={userEmail}
    >
      {children}
    </AppShellClient>
  );
}
