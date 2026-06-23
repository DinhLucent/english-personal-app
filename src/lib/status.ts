import {
  hasCronConfig,
  hasAiConfig,
  hasSupabaseAdminConfig,
  hasSupabaseAppConfig,
  isPersonalMode,
} from "@/lib/config";

export type ServiceStatus = {
  name: string;
  configured: boolean;
  detail: string;
};

export function getServiceStatuses(): ServiceStatus[] {
  return [
    {
      name: "Supabase",
      configured: hasSupabaseAppConfig(),
      detail: hasSupabaseAppConfig()
        ? isPersonalMode()
          ? "Public and admin environment variables are present."
          : "Public environment variables are present."
        : isPersonalMode()
          ? "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and a Supabase admin key are required."
          : "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.",
    },
    {
      name: "DeepSeek",
      configured: hasAiConfig(),
      detail: hasAiConfig()
        ? "DEEPSEEK_API_KEY is present."
        : "DEEPSEEK_API_KEY is missing.",
    },
    {
      name: "Supabase Admin",
      configured: hasSupabaseAdminConfig(),
      detail: hasSupabaseAdminConfig()
        ? "Supabase secret/admin key is present for cron jobs."
        : "SUPABASE_SECRET_KEY is missing. Legacy SUPABASE_SERVICE_ROLE_KEY also works.",
    },
    {
      name: "Cron",
      configured: hasCronConfig(),
      detail: hasCronConfig()
        ? "CRON_SECRET is present."
        : "CRON_SECRET is missing.",
    },
  ];
}
