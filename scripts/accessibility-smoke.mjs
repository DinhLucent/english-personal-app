import { chromium } from "playwright";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const baseUrl = (process.env.ACCESSIBILITY_SMOKE_BASE_URL || process.env.LOCAL_APP_URL || "http://localhost:3002").replace(/\/$/, "");
const outputDir = process.env.ACCESSIBILITY_SMOKE_OUTPUT_DIR || "artifacts/accessibility-smoke";
const waitMs = Number.parseInt(process.env.ACCESSIBILITY_SMOKE_WAIT_MS || "900", 10);
const defaultRoutes = [
  "/dashboard",
  "/daily",
  "/speaking",
  "/review",
  "/conversation",
  "/correction",
  "/vocabulary",
  "/grammar",
  "/reflex",
  "/assessment",
  "/progress",
  "/status",
];

const routes = (process.env.ACCESSIBILITY_SMOKE_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const profiles = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 900 },
];

function formatRoute(route) {
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
}

async function launchBrowser() {
  const requestedChannel = process.env.ACCESSIBILITY_SMOKE_BROWSER_CHANNEL;
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
      errors.push(attempt.label + ": " + (error instanceof Error ? error.message.split("\n")[0] : String(error)));
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

function shortName(snapshot) {
  const text = snapshot.text ? " \"" + snapshot.text + "\"" : "";
  const id = snapshot.id ? "#" + snapshot.id : "";
  return snapshot.tag + id + text;
}

async function collectFocusIssues(page, limit = 28) {
  const issues = [];
  const seen = new Set();
  const focusableCount = await page.evaluate(() => {
    const selector = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && element.getAttribute("aria-hidden") !== "true";
    };
    return [...document.querySelectorAll(selector)].filter(isVisible).length;
  });

  await page.keyboard.press("Home").catch(() => {});
  for (let index = 0; index < Math.min(limit, Math.max(focusableCount + 1, 1)); index += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(25);
    const snapshot = await page.evaluate(() => {
      const element = document.activeElement;
      if (!element || element === document.body || element === document.documentElement) return null;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const visible = rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      const outlineWidth = Number.parseFloat(style.outlineWidth || "0");
      const hasOutline = style.outlineStyle !== "none" && outlineWidth > 0;
      const hasShadow = style.boxShadow && style.boxShadow !== "none";
      const hasOffset = Number.parseFloat(style.outlineOffset || "0") > 0;
      return {
        tag: element.tagName.toLowerCase(),
        id: element.id || "",
        text: (element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
        visible,
        hasVisibleFocus: visible && (hasOutline || hasShadow || hasOffset),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
      };
    });

    if (!snapshot || !snapshot.visible) continue;
    const key = snapshot.tag + ":" + snapshot.id + ":" + snapshot.text;
    seen.add(key);
    if (!snapshot.hasVisibleFocus) {
      issues.push({ type: "focus-indicator", element: shortName(snapshot), outlineStyle: snapshot.outlineStyle, outlineWidth: snapshot.outlineWidth, boxShadow: snapshot.boxShadow });
    }
  }

  if (focusableCount > 1 && seen.size < 2) {
    issues.push({ type: "tab-order", message: "Only " + seen.size + " visible focus target(s) reached out of " + focusableCount + "." });
  }

  return issues;
}

function summarizeConsole(logs) {
  return logs
    .filter((log) => log.type === "error" || log.type === "pageerror")
    .map((log) => ({ type: log.type, text: (log.text || "").slice(0, 700) }));
}

await mkdir(outputDir, { recursive: true });

let ownedServer = null;
if (!(await checkServer())) {
  if (!canStartLocalServer()) {
    console.error("FAIL accessibility smoke server check: " + baseUrl + " is not reachable. Start the app first, or set ACCESSIBILITY_SMOKE_BASE_URL.");
    process.exit(1);
  }
  console.log("Accessibility smoke starting local dev server at " + baseUrl + "...");
  ownedServer = startLocalServer();
  if (!(await waitForServer())) {
    stopLocalServer(ownedServer);
    console.error("FAIL accessibility smoke server check: " + baseUrl + " did not become ready. See " + path.join(outputDir, "dev-server.log"));
    process.exit(1);
  }
}

const { browser, label: browserLabel } = await launchBrowser();
const activeRoutes = routes.length ? routes : defaultRoutes;
const results = [];

for (const route of activeRoutes) {
  for (const profile of profiles) {
    const context = await browser.newContext({
      viewport: { width: profile.width, height: profile.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    const logs = [];
    page.on("console", (message) => logs.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));

    const entry = {
      route,
      profile: profile.name,
      status: null,
      failures: [],
      warnings: [],
      metrics: null,
      screenshotPath: path.join(outputDir, formatRoute(route) + "-" + profile.name + ".png"),
    };

    try {
      const response = await page.goto(baseUrl + route, { waitUntil: "networkidle", timeout: 45000 });
      entry.status = response?.status() ?? null;
      await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 900);
      await page.screenshot({ path: entry.screenshotPath, fullPage: true });

      entry.metrics = await page.evaluate(() => {
        const isVisible = (element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden" && element.getAttribute("aria-hidden") !== "true";
        };
        const textOf = (element) => (element?.textContent || "").trim().replace(/\s+/g, " ");
        const labelledByText = (element) => {
          const ids = (element.getAttribute("aria-labelledby") || "").split(/\s+/).filter(Boolean);
          return ids.map((id) => textOf(document.getElementById(id))).join(" ").trim();
        };
        const hasFormLabel = (element) => {
          if ((element.getAttribute("aria-label") || "").trim()) return true;
          if (labelledByText(element)) return true;
          if (element.closest("label") && textOf(element.closest("label"))) return true;
          if (element.id) {
            const label = document.querySelector('label[for="' + CSS.escape(element.id) + '"]');
            if (label && textOf(label)) return true;
          }
          return false;
        };
        const accessibleName = (element) => {
          return (
            (element.getAttribute("aria-label") || "").trim() ||
            labelledByText(element) ||
            (element.getAttribute("title") || "").trim() ||
            textOf(element)
          );
        };
        const describe = (element) => ({
          tag: element.tagName.toLowerCase(),
          id: element.id || "",
          text: accessibleName(element).slice(0, 90),
          placeholder: (element.getAttribute("placeholder") || "").slice(0, 90),
          type: element.getAttribute("type") || "",
        });

        const formControls = [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].filter(isVisible);
        const missingFormLabels = formControls.filter((element) => !hasFormLabel(element)).map(describe);
        const actionSelector = 'button, a[href], [role="button"], [role="link"]';
        const unnamedActions = [...document.querySelectorAll(actionSelector)]
          .filter(isVisible)
          .filter((element) => !accessibleName(element))
          .map(describe);
        const liveRegionIssues = [...document.querySelectorAll('[role="status"], [role="alert"]')]
          .filter(isVisible)
          .filter((element) => !(element.getAttribute("aria-live") || "").trim())
          .map(describe);
        const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(isVisible);
        const emptyHeadings = headings.filter((heading) => !textOf(heading)).map(describe);
        const headingLevels = headings.map((heading) => Number.parseInt(heading.tagName.slice(1), 10));
        const skippedHeadingJumps = [];
        for (let index = 1; index < headingLevels.length; index += 1) {
          if (headingLevels[index] - headingLevels[index - 1] > 1) {
            skippedHeadingJumps.push({ from: headingLevels[index - 1], to: headingLevels[index] });
          }
        }

        return {
          title: document.querySelector("h1")?.textContent?.trim() || "",
          formControlCount: formControls.length,
          actionCount: [...document.querySelectorAll(actionSelector)].filter(isVisible).length,
          missingFormLabels,
          unnamedActions,
          liveRegionIssues,
          emptyHeadings,
          skippedHeadingJumps,
        };
      });

      if (!entry.metrics.title) entry.failures.push({ type: "heading", message: "Missing visible h1." });
      if (entry.metrics.missingFormLabels.length) entry.failures.push({ type: "form-label", items: entry.metrics.missingFormLabels });
      if (entry.metrics.unnamedActions.length) entry.failures.push({ type: "action-name", items: entry.metrics.unnamedActions });
      if (entry.metrics.liveRegionIssues.length) entry.failures.push({ type: "live-region", items: entry.metrics.liveRegionIssues });
      if (entry.metrics.emptyHeadings.length) entry.failures.push({ type: "empty-heading", items: entry.metrics.emptyHeadings });
      if (entry.metrics.skippedHeadingJumps.length) entry.warnings.push({ type: "heading-order", items: entry.metrics.skippedHeadingJumps });

      entry.failures.push(...(await collectFocusIssues(page)));
    } catch (error) {
      entry.failures.push({ type: "navigation", text: error instanceof Error ? error.message : String(error) });
    }

    if (entry.status === null || entry.status >= 400) {
      entry.failures.push({ type: "http", status: entry.status });
    }
    entry.failures.push(...summarizeConsole(logs));
    results.push(entry);
    await context.close();
  }
}

await browser.close();
stopLocalServer(ownedServer);

const failures = results.filter((entry) => entry.failures.length > 0);
const report = {
  baseUrl,
  browser: browserLabel,
  outputDir,
  waitMs,
  routeCount: activeRoutes.length,
  profileCount: profiles.length,
  checkedAt: new Date().toISOString(),
  failures,
  warnings: results.filter((entry) => entry.warnings.length > 0),
  results,
};
const reportPath = path.join(outputDir, "report.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));

for (const entry of results) {
  const ok = entry.failures.length === 0;
  const warningText = entry.warnings.length ? " (" + entry.warnings.length + " warning group(s))" : "";
  console.log((ok ? "OK" : "FAIL") + " " + entry.profile + " " + entry.route + " HTTP " + (entry.status ?? "--") + warningText);
}

console.log("Accessibility smoke report: " + reportPath);

const exitCode = failures.length ? 1 : 0;
if (failures.length) {
  console.error("Accessibility smoke failed: " + failures.length + " page/profile check(s) need attention.");
} else {
  console.log("Accessibility smoke passed: " + results.length + " page/profile check(s).");
}
process.exit(exitCode);
