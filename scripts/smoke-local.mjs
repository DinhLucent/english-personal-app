import { loadLocalEnv } from "./lib/env.mjs";

const baseUrl = process.env.LOCAL_APP_URL || "http://localhost:3001";
const env = loadLocalEnv();

const routes = [
  "/dashboard",
  "/daily",
  "/conversation",
  "/correction",
  "/vocabulary",
  "/grammar",
  "/reflex",
  "/assessment",
  "/progress",
  "/status",
  "/login",
];

let hasFailure = false;

for (const route of routes) {
  try {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    const ok = response.status >= 200 && response.status < 400;
    console.log(`${ok ? "OK" : "FAIL"} ${route} HTTP ${response.status}`);
    if (!ok) {
      hasFailure = true;
    }
  } catch (error) {
    hasFailure = true;
    console.log(`FAIL ${route} ${error instanceof Error ? error.message : String(error)}`);
  }
}

const correctionResponse = await fetch(`${baseUrl}/api/ai/correction`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "I am responsible to build feature." }),
});
const correctionJson = await correctionResponse.json().catch(() => null);

if (env.DEEPSEEK_API_KEY) {
  const ok = correctionResponse.ok && correctionJson?.ok === true;
  console.log(`${ok ? "OK" : "FAIL"} /api/ai/correction real AI check`);
  if (!ok) hasFailure = true;
} else {
  const ok = correctionResponse.status === 503 && correctionJson?.error?.code === "missing_ai_key";
  console.log(`${ok ? "OK" : "FAIL"} /api/ai/correction missing-key guard`);
  if (!ok) hasFailure = true;
}

if (hasFailure) {
  process.exitCode = 1;
}

const healthResponse = await fetch(`${baseUrl}/api/health`);
const healthJson = await healthResponse.json().catch(() => null);
const healthOk = healthResponse.ok && healthJson && Array.isArray(healthJson.services);
console.log(`${healthOk ? "OK" : "FAIL"} /api/health`);
if (!healthOk) {
  process.exitCode = 1;
}

const historyResponse = await fetch(`${baseUrl}/api/history?type=corrections&limit=1`);
const historyJson = await historyResponse.json().catch(() => null);
const historyOk = historyResponse.ok && historyJson?.ok === true && Array.isArray(historyJson.data?.items);
console.log(`${historyOk ? "OK" : "FAIL"} /api/history`);
if (!historyOk) {
  process.exitCode = 1;
}

const cronResponse = await fetch(`${baseUrl}/api/cron/daily-lessons`);
const cronJson = await cronResponse.json().catch(() => null);
const cronGuardOk =
  cronResponse.status === 401 && cronJson?.error?.code === "unauthorized";
console.log(`${cronGuardOk ? "OK" : "FAIL"} /api/cron/daily-lessons unauthorized guard`);
if (!cronGuardOk) {
  process.exitCode = 1;
}
