import { loadLocalEnv } from "./lib/env.mjs";

const baseUrl = process.env.LOCAL_APP_URL || "http://localhost:3001";
const env = loadLocalEnv();

const routes = [
  "/dashboard",
  "/daily",
  "/speaking",
  "/speaking?mission=workplace-day-30-final-mini-assessment",
  "/review",
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

const reviewResponse = await fetch(`${baseUrl}/api/review?limit=2`);
const reviewJson = await reviewResponse.json().catch(() => null);
const reviewOk =
  reviewResponse.ok &&
  reviewJson?.ok === true &&
  Array.isArray(reviewJson.data?.items) &&
  typeof reviewJson.data?.source === "string";
console.log(`${reviewOk ? "OK" : "FAIL"} /api/review due items`);
if (!reviewOk) {
  process.exitCode = 1;
}

const reviewInvalidResponse = await fetch(`${baseUrl}/api/review`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ itemId: "not-a-uuid", rating: "good" }),
});
const reviewInvalidJson = await reviewInvalidResponse.json().catch(() => null);
const reviewInvalidOk =
  reviewInvalidResponse.status === 400 &&
  reviewInvalidJson?.error?.code === "invalid_request";
console.log(`${reviewInvalidOk ? "OK" : "FAIL"} /api/review invalid-request guard`);
if (!reviewInvalidOk) {
  process.exitCode = 1;
}

const speakingMissingMissionResponse = await fetch(`${baseUrl}/api/ai/speaking`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "roleplay",
    missionId: "missing-speaking-mission",
    messages: [],
  }),
});
const speakingMissingMissionJson = await speakingMissingMissionResponse
  .json()
  .catch(() => null);
const speakingMissingMissionOk =
  speakingMissingMissionResponse.status === 404 &&
  speakingMissingMissionJson?.error?.code === "mission_not_found";
console.log(`${speakingMissingMissionOk ? "OK" : "FAIL"} /api/ai/speaking mission guard`);
if (!speakingMissingMissionOk) {
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
