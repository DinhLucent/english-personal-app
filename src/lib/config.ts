export const appConfig = {
  name: "SpeakFlow AI",
  tagline: "Daily English coaching that fits your workday.",
  defaultDurationDays: 30,
};

export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isPersonalMode() {
  return process.env.AUTH_MODE !== "supabase";
}

export function hasSupabaseAdminConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      getSupabaseAdminKey(),
  );
}

export function hasSupabaseAppConfig() {
  return hasSupabaseConfig() && (!isPersonalMode() || hasSupabaseAdminConfig());
}

export function getSupabaseAdminKey() {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

export function hasAiConfig() {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}

export function hasCronConfig() {
  return Boolean(process.env.CRON_SECRET);
}
