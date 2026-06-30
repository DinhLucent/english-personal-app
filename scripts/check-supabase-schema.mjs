import { loadLocalEnv } from "./lib/env.mjs";

const env = loadLocalEnv();
const requiredTables = [
  "profiles",
  "learning_plans",
  "daily_lessons",
  "lesson_attempts",
  "practice_sessions",
  "conversation_messages",
  "vocabulary_items",
  "corrections",
  "assessments",
  "ai_requests",
  "missions",
  "mission_attempts",
  "speaking_attempts",
  "review_items",
];
const supabaseAdminKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const schemaCheckKey = supabaseAdminKey || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function fail(message) {
  console.log(`FAIL ${message}`);
  process.exitCode = 1;
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  fail("Supabase env vars are missing.");
} else {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");

  for (const table of requiredTables) {
    try {
      const response = await fetch(`${baseUrl}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          apikey: schemaCheckKey,
          Authorization: `Bearer ${schemaCheckKey}`,
        },
      });

      if (response.ok) {
        console.log(`OK ${table}`);
      } else {
        const body = await response.text();
        fail(`${table} returned HTTP ${response.status}: ${body.slice(0, 180)}`);
      }
    } catch (error) {
      fail(`${table}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (!supabaseAdminKey) {
  fail("SUPABASE_SECRET_KEY is missing. Legacy SUPABASE_SERVICE_ROLE_KEY also works.");
} else if (env.NEXT_PUBLIC_SUPABASE_URL) {
  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/profiles?select=id&limit=1`, {
    headers: {
      apikey: supabaseAdminKey,
    },
  }).catch((error) => {
    fail(`Supabase admin request failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });

  if (response) {
    if (response.ok) {
      console.log("OK supabase-admin access");
    } else {
      const body = await response.text();
      fail(`supabase-admin access returned HTTP ${response.status}: ${body.slice(0, 180)}`);
    }
  }
}
