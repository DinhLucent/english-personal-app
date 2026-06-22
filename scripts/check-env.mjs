import { loadLocalEnv } from "./lib/env.mjs";

const root = process.cwd();
const shouldCheckNetwork = process.argv.includes("--network");
const env = loadLocalEnv(root);

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DEEPSEEK_API_KEY",
  "CRON_SECRET",
];

const results = required.map((name) => ({
  name,
  present: Boolean(env[name]),
}));

results.splice(2, 0, {
  name: "SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY",
  present: Boolean(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY),
});

async function checkSupabase() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ok: false, message: "Supabase env vars are missing." };
  }

  const url = `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/auth/v1/settings`;
  const response = await fetch(url, {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
  });

  return {
    ok: response.ok,
    message: `Supabase auth settings returned HTTP ${response.status}.`,
  };
}

async function checkDeepSeek() {
  if (!env.DEEPSEEK_API_KEY) {
    return { ok: false, message: "DEEPSEEK_API_KEY is missing." };
  }

  const baseUrl = (env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
  });

  return {
    ok: response.ok,
    message: `DeepSeek models endpoint returned HTTP ${response.status}.`,
  };
}

const missing = results.filter((result) => !result.present);
console.log("Environment check");
for (const result of results) {
  console.log(`${result.present ? "OK" : "MISSING"} ${result.name}`);
}

if (shouldCheckNetwork) {
  const [supabase, deepSeek] = await Promise.allSettled([checkSupabase(), checkDeepSeek()]);
  const networkResults = [
    ["Supabase", supabase],
    ["DeepSeek", deepSeek],
  ];

  for (const [name, result] of networkResults) {
    if (result.status === "fulfilled") {
      console.log(`${result.value.ok ? "OK" : "FAIL"} ${name}: ${result.value.message}`);
    } else {
      console.log(`FAIL ${name}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
    }
  }

  const hasNetworkFailure = networkResults.some(([, result]) => {
    return result.status !== "fulfilled" || !result.value.ok;
  });

  if (missing.length || hasNetworkFailure) {
    process.exitCode = 1;
  }
} else if (missing.length) {
  console.log("\nCreate .env.local from .env.example, then fill the missing values.");
  process.exitCode = 1;
}
