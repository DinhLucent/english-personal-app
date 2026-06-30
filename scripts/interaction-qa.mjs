import { chromium } from "playwright";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const baseUrl = (process.env.INTERACTION_QA_BASE_URL || process.env.LOCAL_APP_URL || "http://localhost:3002").replace(/\/$/, "");
const outputDir = process.env.INTERACTION_QA_OUTPUT_DIR || "artifacts/interaction-qa";
const waitMs = Number.parseInt(process.env.INTERACTION_QA_WAIT_MS || "250", 10);

function formatName(name) {
  return name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "journey";
}

function meta() {
  return { model: "interaction-qa", latencyMs: 12, tokensInput: null, tokensOutput: null };
}

function agentResponse(data, persistence) {
  return { ok: true, data: { data, meta: meta(), persistence } };
}

function apiResponse(data) {
  return { ok: true, data };
}

async function fulfillJson(route, payload) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

async function launchBrowser() {
  const requestedChannel = process.env.INTERACTION_QA_BROWSER_CHANNEL;
  const attempts = requestedChannel
    ? [{ label: requestedChannel, options: { channel: requestedChannel, headless: true } }]
    : [
        { label: "bundled chromium", options: { headless: true } },
        { label: "chrome", options: { channel: "chrome", headless: true } },
        { label: "msedge", options: { channel: "msedge", headless: true } },
      ];

  const errors = [];
  for (const attempt of attempts) {
    try {
      const browser = await chromium.launch(attempt.options);
      return { browser, label: attempt.label };
    } catch (error) {
      errors.push(attempt.label + ": " + (error instanceof Error ? error.message.split("\\n")[0] : String(error)));
    }
  }

  throw new Error("Could not launch a browser. Tried " + errors.join(" | "));
}

async function checkServer() {
  try {
    const response = await fetch(baseUrl + "/api/health");
    return response.ok || response.status < 500;
  } catch {
    return false;
  }
}

function getBaseUrlParts() {
  try {
    return new URL(baseUrl);
  } catch {
    return null;
  }
}

function canStartLocalServer() {
  const url = getBaseUrlParts();
  return Boolean(url && ["localhost", "127.0.0.1", "::1"].includes(url.hostname));
}

function getSpawnEnv() {
  const env = { ...process.env };
  if (process.platform !== "win32") return env;
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === "path");
  const pathValue = pathKey ? env[pathKey] : "";
  for (const key of Object.keys(env)) {
    if (key.toLowerCase() === "path") delete env[key];
  }
  env.Path = pathValue;
  return env;
}

function startLocalServer() {
  const url = getBaseUrlParts();
  const port = url?.port || "3000";
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npm.cmd run dev -- --port " + port]
    : ["run", "dev", "--", "--port", port];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: getSpawnEnv(),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const logPath = path.join(outputDir, "dev-server.log");
  child.stdout.on("data", (chunk) => {
    void appendFile(logPath, "[stdout] " + chunk.toString());
  });
  child.stderr.on("data", (chunk) => {
    void appendFile(logPath, "[stderr] " + chunk.toString());
  });
  return child;
}

async function waitForServer(timeoutMs = 60000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await checkServer()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function stopLocalServer(child) {
  if (!child || child.killed || !child.pid) return;
  child.stdout?.destroy();
  child.stderr?.destroy();
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true, timeout: 5000 });
    return;
  }
  child.kill("SIGTERM");
}

async function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function expectActiveId(page, id, message) {
  await page.waitForFunction((expectedId) => document.activeElement?.id === expectedId, id, { timeout: 5000 });
  await assert(await page.evaluate((expectedId) => document.activeElement?.id === expectedId, id), message);
}

async function expectActiveReviewAction(page, message) {
  await page.waitForFunction(() => Boolean(document.activeElement?.getAttribute("data-review-action")), null, { timeout: 5000 });
  await assert(await page.evaluate(() => Boolean(document.activeElement?.getAttribute("data-review-action"))), message);
}

async function expectLearningEvents(page, expected, message) {
  await page.waitForFunction(
    (kinds) => kinds.every((kind) => (window.__speakflowLearningEvents || []).includes(kind)),
    expected,
    { timeout: 5000 },
  );
  const events = await page.evaluate(() => window.__speakflowLearningEvents || []);
  for (const kind of expected) {
    await assert(events.includes(kind), message + ": missing " + kind + " in " + events.join(", "));
  }
}

async function setupCommonRoutes(page) {
  await page.route("**/api/history**", async (route) => {
    await fulfillJson(route, apiResponse({ items: [], source: "empty", reason: "Interaction QA mock." }));
  });
  await page.route("**/api/progress/save-practice-session", async (route) => {
    await fulfillJson(route, { ok: true, data: { saved: true, table: "practice_sessions", id: "qa-practice-session" } });
  });
}

async function runJourney(browser, journey) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    window.__speakflowLearningEvents = [];
    window.__speakflowCopiedText = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.__speakflowCopiedText = text;
        },
      },
    });
    window.addEventListener("speakflow:learning-event", (event) => {
      window.__speakflowLearningEvents.push(event.detail?.kind);
    });
  });
  const page = await context.newPage();
  const logs = [];
  page.on("console", (message) => logs.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));
  await setupCommonRoutes(page);

  const result = {
    name: journey.name,
    status: "passed",
    checks: [],
    errors: [],
    screenshotPath: path.join(outputDir, formatName(journey.name) + ".png"),
  };

  try {
    await journey.run(page, result.checks);
    await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 250);
  } catch (error) {
    result.status = "failed";
    result.errors.push({ type: "journey", text: error instanceof Error ? error.message : String(error) });
  }

  result.events = await page.evaluate(() => window.__speakflowLearningEvents || []).catch(() => []);

  const relevantLogs = logs.filter((log) => log.type === "error" || log.type === "pageerror");
  if (relevantLogs.length) {
    result.status = "failed";
    result.errors.push(...relevantLogs.map((log) => ({ type: log.type, text: (log.text || "").slice(0, 700) })));
  }

  await page.screenshot({ path: result.screenshotPath, fullPage: true }).catch(() => {});
  await context.close();
  return result;
}

function reviewItem(id, sourceType, content) {
  const now = new Date().toISOString();
  return {
    id,
    sourceType,
    sourceId: null,
    missionId: null,
    content,
    meaningVi: sourceType === "vocabulary" ? "nghia tieng Viet" : null,
    example: "Could you clarify the deadline?",
    errorPattern: sourceType === "error" ? "responsible to" : null,
    correctForm: sourceType === "error" ? "responsible for" : null,
    nextReviewAt: now,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

const journeys = [
  {
    name: "conversation turn and summary",
    run: async (page, checks) => {
      let replyCount = 0;
      await page.route("**/api/ai/conversation", async (route) => {
        const body = route.request().postDataJSON();
        if (body.mode === "summary") {
          await fulfillJson(route, agentResponse({
            summaryVi: "Ban da hoi va tra loi ro hon trong tinh huong cong viec.",
            strengths: ["Clear intent"],
            mistakesToReview: ["Use responsible for"],
            suggestedNextPractice: "Practice clarifying a deadline.",
            score: 82,
          }));
          return;
        }

        replyCount += 1;
        await fulfillJson(route, agentResponse({
          reply: "Thanks. Please answer one more workplace question.",
          correction: replyCount === 1 ? "Start by answering the first question." : "Say responsible for, not responsible to.",
          naturalAnswer: replyCount === 1 ? "I can help clarify the scope." : "I am responsible for clarifying the scope.",
          nextQuestion: replyCount === 1 ? "What is one blocker today?" : "How will you update the team?",
          score: replyCount === 1 ? 78 : 84,
        }));
      });

      await page.goto(baseUrl + "/conversation", { waitUntil: "networkidle" });
      await assert(await page.getByRole("button", { name: "Send" }).isDisabled(), "Conversation Send should be disabled before a session starts.");
      checks.push("send disabled before start");
      await page.getByRole("button", { name: "Start", exact: true }).click();
      await page.getByText("What is one blocker today?").waitFor({ state: "visible" });
      await expectActiveId(page, "conversation-answer", "Conversation answer should receive focus after Start.");
      checks.push("focus after start");
      await page.locator("#conversation-answer").fill("I am responsible to clarify the scope.");
      await page.locator("#conversation-answer").press("Enter");
      await page.getByText("How will you update the team?").waitFor({ state: "visible" });
      await expectActiveId(page, "conversation-answer", "Conversation answer should keep focus after sending.");
      checks.push("enter sends answer and restores focus");
      await assert((await page.locator("#conversation-answer").inputValue()) === "", "Conversation answer should clear after send.");
      await page.getByRole("button", { name: "Stop & Summary" }).click();
      await page.getByText("Practice clarifying a deadline.").waitFor({ state: "visible" });
      const completed = await page.evaluate(() => localStorage.getItem("speakflow:conversation-completed"));
      await assert(completed === "true", "Conversation completion should set local progress flag.");
      await expectLearningEvents(page, ["start", "send", "feedback", "complete"], "Conversation learning events should cover the full loop");
      checks.push("summary feedback, completion flag, and learning events");
    },
  },
  {
    name: "reflex drill completion",
    run: async (page, checks) => {
      const questions = Array.from({ length: 10 }, (_, index) => "Mock reflex question " + (index + 1) + "?");
      let feedbackCount = 0;
      await page.route("**/api/ai/reflex", async (route) => {
        const body = route.request().postDataJSON();
        if (body.mode === "questions") {
          await fulfillJson(route, agentResponse({ questions }));
          return;
        }

        feedbackCount += 1;
        await fulfillJson(route, agentResponse({
          correction: "Use a complete short answer.",
          naturalAnswer: "I will update the team after I clarify the scope.",
          nextQuestion: questions[Math.min(feedbackCount, questions.length - 1)],
          score: 80 + (feedbackCount % 5),
        }));
      });

      await page.goto(baseUrl + "/reflex", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Generate Drill", exact: true }).click();
      await page.getByText("Mock reflex question 1?").waitFor({ state: "visible" });
      await expectActiveId(page, "reflex-answer", "Reflex answer should receive focus after generating questions.");
      checks.push("focus after drill generation");
      for (let index = 1; index <= 10; index += 1) {
        await page.locator("#reflex-answer").fill("I will clarify it today " + index + ".");
        await page.locator("#reflex-answer").press("Enter");
        if (index < 10) {
          await page.getByText("Answered " + index + " of 10").waitFor({ state: "visible" });
          await expectActiveId(page, "reflex-answer", "Reflex answer should keep focus between prompts.");
        }
      }
      await page.getByText("Reflex session saved", { exact: true }).waitFor({ state: "visible" });
      await expectActiveId(page, "reflex-session-status", "Reflex completion status should receive focus after the final answer.");
      const completed = await page.evaluate(() => localStorage.getItem("speakflow:reflex-completed"));
      await assert(completed === "true", "Reflex completion should set local progress flag.");
      await expectLearningEvents(page, ["start", "send", "feedback", "complete"], "Reflex learning events should cover the full loop");
      checks.push("completion feedback, focus, and learning events");
    },
  },
  {
    name: "speaking studio full path",
    run: async (page, checks) => {
      await page.addInitScript(() => {
        class FakeSpeechRecognition {
          constructor() {
            this.lang = "en-US";
            this.continuous = false;
            this.interimResults = true;
            this.onresult = null;
            this.onerror = null;
            this.onend = null;
          }

          start() {
            setTimeout(() => {
              const transcript = window.__speakflowVoiceTranscript || "I am responsible to clarify the blocker.";
              this.onresult?.({
                results: {
                  length: 1,
                  0: { 0: { transcript } },
                },
              });
              this.onend?.();
            }, 20);
          }

          stop() {
            this.onend?.();
          }

          abort() {
            this.onend?.();
          }
        }

        window.SpeechRecognition = FakeSpeechRecognition;
        window.webkitSpeechRecognition = FakeSpeechRecognition;
      });
      await page.route("**/api/ai/speaking", async (route) => {
        const body = route.request().postDataJSON();
        if (body.mode === "roleplay" && (!body.messages || body.messages.length === 0)) {
          await fulfillJson(route, agentResponse({
            reply: "You are in a standup. Explain the blocker clearly.",
            nextQuestion: "What is blocking your task today?",
            expectedFocus: "clarify blocker",
            suggestedChunks: ["I am blocked by", "Could you clarify"],
          }, { saved: true, status: "started", currentStep: "roleplay", id: "qa-mission-attempt" }));
          return;
        }
        if (body.mode === "roleplay") {
          await fulfillJson(route, agentResponse({
            reply: "Thanks. Could you share the next step with the team?",
            nextQuestion: "What will you say next?",
            expectedFocus: "next action",
            suggestedChunks: ["I will update", "after I confirm"],
          }, { saved: true, status: "started", currentStep: "roleplay", id: "qa-mission-attempt" }));
          return;
        }
        if (body.mode === "feedback") {
          await fulfillJson(route, agentResponse({
            scores: { taskCompletion: 4, fluency: 4, accuracy: 3, vocabulary: 4, interaction: 4 },
            mainIssue: "Use responsible for and add a next action.",
            evidence: ["responsible to clarify"],
            betterAnswer: "I am responsible for clarifying the blocker, and I will update the team after I confirm the scope.",
            deliverySignals: {
              inputMode: body.inputMode || "typed",
              lengthSignal: "The answer is long enough for a useful standup update.",
              paceSignal: "The browser transcript pace is steady enough to retry.",
              transcriptSignal: body.voiceMetrics?.transcriptEdited ? "Transcript was edited before feedback." : "Transcript was submitted as captured.",
              nextVoiceAction: "Shadow the better answer once, then retry by voice.",
            },
            retryTask: {
              prompt: "Rewrite your answer with one clear next action.",
              requiredChunks: ["responsible for", "I will update"],
              successCriteria: ["clear next action"],
            },
            reviewCandidates: [{ type: "error", content: "responsible to", correctForm: "responsible for" }],
          }, { saved: true, status: "started", currentStep: "feedback", id: "qa-speaking-attempt", speakingAttemptId: "qa-speaking-attempt", reviewItemsCreated: 1 }));
          return;
        }
        await fulfillJson(route, agentResponse({
          improved: true,
          comparisonVi: "Cau tra loi moi ro hon va co hanh dong tiep theo.",
          scores: { taskCompletion: 5, fluency: 4, accuracy: 4, vocabulary: 5, interaction: 4 },
          remainingIssue: "Keep it concise.",
          nextAction: "Practice one more standup answer.",
          deliverySignals: {
            inputMode: body.inputMode || "typed",
            lengthSignal: "The retry has enough detail without becoming too long.",
            paceSignal: "The retry pace is in a steady practice range.",
            transcriptSignal: body.voiceMetrics?.transcriptEdited ? "You edited the voice transcript before checking retry." : "Voice transcript was submitted without edits.",
            nextVoiceAction: "Use the same pace for tomorrow's mission.",
          },
          reviewCandidates: [{ type: "chunk", content: "I will update the team" }],
        }, { saved: true, status: "completed", currentStep: "review", id: "qa-retry-attempt", speakingAttemptId: "qa-retry-attempt", reviewItemsCreated: 1 }));
      });

      await page.goto(baseUrl + "/speaking", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Start Roleplay" }).click();
      await page.getByText("What is blocking your task today?").waitFor({ state: "visible" });
      await expectActiveId(page, "speaking-roleplay-answer", "Speaking roleplay textarea should receive focus after start.");
      checks.push("focus after start roleplay");
      await assert(await page.getByRole("button", { name: "Send" }).isDisabled(), "Speaking Send should be disabled before roleplay text.");
      await page.evaluate(() => {
        window.__speakflowVoiceTranscript = "I am responsible to clarify the blocker.";
      });
      await page.getByLabel("Voice transcript").getByRole("button", { name: "Record" }).click();
      await page.waitForFunction(() => document.querySelector("#speaking-roleplay-answer")?.value.includes("responsible to clarify"), null, { timeout: 5000 });
      await page.locator("#speaking-roleplay-answer").fill("I am responsible to clarify the blocker today.");
      await page.getByRole("button", { name: "Send" }).click();
      await page.getByText("What will you say next?").waitFor({ state: "visible" });
      await expectActiveId(page, "speaking-feedback-action", "Get Feedback should receive focus after sending roleplay answer.");
      checks.push("voice record, transcript edit, and focus after sending roleplay");
      await page.locator("#speaking-feedback-action").click();
      await page.getByText("Rubric signal").waitFor({ state: "visible" });
      await expectActiveId(page, "speaking-retry-answer", "Retry answer should receive focus after feedback.");
      checks.push("focus after feedback");
      await assert(await page.getByRole("button", { name: "Check Retry" }).isDisabled(), "Check Retry should be disabled before retry text.");
      await page.evaluate(() => {
        window.__speakflowVoiceTranscript = "I am responsible for clarifying the blocker and I will update the team after I confirm scope.";
      });
      await page.getByLabel("Retry by voice").getByRole("button", { name: "Record" }).click();
      await page.waitForFunction(() => document.querySelector("#speaking-retry-answer")?.value.includes("responsible for clarifying"), null, { timeout: 5000 });
      await page.locator("#speaking-retry-answer").fill("I am responsible for clarifying the blocker, and I will update the team after I confirm scope.");
      await page.getByRole("button", { name: "Check Retry" }).click();
      await page.getByText("Mission complete").waitFor({ state: "visible" });
      await expectActiveId(page, "speaking-review-panel", "Retry review panel should receive focus after completion.");
      const completed = await page.evaluate(() => localStorage.getItem("speakflow:speaking-completed"));
      await assert(completed === "true", "Speaking completion should set local progress flag.");
      await expectLearningEvents(page, ["start", "send", "feedback", "retry", "complete"], "Speaking learning events should cover the full loop");
      checks.push("completion feedback, focus, and learning events");
    },
  },
  {
    name: "review queue shortcuts and focus",
    run: async (page, checks) => {
      let items = [
        reviewItem("00000000-0000-4000-8000-000000000001", "error", "responsible to"),
        reviewItem("00000000-0000-4000-8000-000000000002", "chunk", "Could you clarify the deadline?"),
      ];
      let reviewPostCount = 0;
      await page.route("**/api/review**", async (route) => {
        if (route.request().method() === "GET") {
          await fulfillJson(route, apiResponse({ items, source: "supabase" }));
          return;
        }
        const body = route.request().postDataJSON();
        reviewPostCount += 1;
        const item = items.find((candidate) => candidate.id === body.itemId) || items[0];
        items = items.filter((candidate) => candidate.id !== body.itemId);
        await fulfillJson(route, apiResponse({ saved: true, table: "review_items", id: body.itemId, item: { ...item, reviewCount: item.reviewCount + 1, nextReviewAt: new Date(Date.now() + 86400000).toISOString() } }));
      });

      await page.goto(baseUrl + "/review", { waitUntil: "networkidle" });
      await page.getByRole("heading", { name: "responsible to", exact: true }).waitFor({ state: "visible" });
      await assert((await page.locator('[data-review-action="good"]').first().getAttribute("aria-keyshortcuts")) === "2", "Good review action should expose shortcut 2.");
      await page.evaluate(() => {
        const input = document.createElement("input");
        input.id = "shortcut-safety-input";
        input.setAttribute("aria-label", "Shortcut safety input");
        document.body.append(input);
        input.focus();
      });
      await page.keyboard.press("1");
      await page.waitForTimeout(150);
      await assert(reviewPostCount === 0, "Review shortcut should not trigger while focus is inside an input.");
      await page.locator("#shortcut-safety-input").evaluate((element) => element.remove());
      checks.push("shortcuts ignored in editable targets");
      await page.locator("body").click({ position: { x: 8, y: 8 } });
      await page.keyboard.press("2");
      await page.getByText("Saved for tomorrow").waitFor({ state: "visible" });
      await page.getByRole("heading", { name: "responsible to", exact: true }).waitFor({ state: "hidden" });
      await expectActiveReviewAction(page, "Next review action should receive focus after rating an item.");
      checks.push("shortcut rating and next focus");
      await page.keyboard.press("3");
      await page.getByText("You are caught up").waitFor({ state: "visible" });
      await expectActiveId(page, "review-queue-region", "Clear queue region should receive focus after the final review item.");
      await expectLearningEvents(page, ["review"], "Review learning events should fire after rating items");
      checks.push("clear queue feedback, focus, and learning events");
    },
  },
  {
    name: "generated output copy and reuse",
    run: async (page, checks) => {
      const natural = "I am responsible for building the feature and fixing bugs for my team.";
      await page.route("**/api/ai/correction", async (route) => {
        await fulfillJson(route, agentResponse({
          corrected: natural,
          natural,
          score: 82,
          mistakes: [
            {
              text: "responsible to",
              issue: "Wrong collocation after responsible.",
              fix: "responsible for",
              explanationVi: "Sau responsible, dung for khi noi ve viec minh phu trach.",
            },
          ],
        }));
      });

      await page.goto(baseUrl + "/correction", { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Correct", exact: true }).click();
      await page.getByText("Feedback ready").waitFor({ state: "visible" });
      await page.getByRole("button", { name: "Copy feedback" }).click();
      await page.getByRole("button", { name: "Copied to clipboard" }).waitFor({ state: "visible" });
      await page.locator('[data-copy-state="copied"]').first().waitFor({ state: "visible" });
      const copiedText = await page.evaluate(() => window.__speakflowCopiedText || "");
      await assert(copiedText.includes("Score: 82") && copiedText.includes(natural), "Copy feedback should write the correction summary to clipboard.");
      await expectLearningEvents(page, ["review"], "Copy feedback should emit a lightweight review learning event");
      checks.push("copy feedback writes clipboard text, updates state, and emits learning event");

      await page.getByRole("button", { name: "Use natural" }).click();
      await page.getByRole("button", { name: "Loaded" }).waitFor({ state: "visible" });
      await assert((await page.locator("#correction-text").inputValue()) === natural, "Use natural should move the natural version back into the correction textarea.");
      await expectActiveId(page, "correction-text", "Use natural should return focus to the correction textarea.");
      checks.push("use natural moves generated output back into the input and restores focus");
    },
  },
];

await mkdir(outputDir, { recursive: true });

let ownedServer = null;
if (!(await checkServer())) {
  if (!canStartLocalServer()) {
    console.error("FAIL interaction QA server check: " + baseUrl + " is not reachable. Start the app first, or set INTERACTION_QA_BASE_URL.");
    process.exit(1);
  }
  console.log("Interaction QA starting local dev server at " + baseUrl + "...");
  ownedServer = startLocalServer();
  if (!(await waitForServer())) {
    stopLocalServer(ownedServer);
    console.error("FAIL interaction QA server check: " + baseUrl + " did not become ready. See " + path.join(outputDir, "dev-server.log"));
    process.exit(1);
  }
}

const { browser, label: browserLabel } = await launchBrowser();
const results = [];

for (const journey of journeys) {
  const result = await runJourney(browser, journey);
  results.push(result);
  console.log((result.status === "passed" ? "OK" : "FAIL") + " " + journey.name + " (" + result.checks.length + " checks) " + result.screenshotPath);
}

await browser.close();
stopLocalServer(ownedServer);

const failures = results.filter((result) => result.status !== "passed");
const report = {
  baseUrl,
  browser: browserLabel,
  outputDir,
  checkedAt: new Date().toISOString(),
  failures,
  results,
};
const reportPath = path.join(outputDir, "report.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));
console.log("Interaction QA report: " + reportPath);

const exitCode = failures.length ? 1 : 0;
if (failures.length) {
  console.error("Interaction QA failed: " + failures.length + " journey(s) need attention.");
} else {
  console.log("Interaction QA passed: " + results.length + " journey(s).");
}
process.exit(exitCode);
