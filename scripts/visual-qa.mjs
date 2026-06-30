import { chromium } from "playwright";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const baseUrl = (process.env.VISUAL_QA_BASE_URL || process.env.LOCAL_APP_URL || "http://localhost:3002").replace(/\/$/, "");
const outputDir = process.env.VISUAL_QA_OUTPUT_DIR || "artifacts/visual-checks/visual-qa";
const waitMs = Number.parseInt(process.env.VISUAL_QA_WAIT_MS || "1800", 10);
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

const routes = (process.env.VISUAL_QA_ROUTES || "")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const profiles = [
  { name: "desktop", width: 1440, height: 1000, reducedMotion: "no-preference" },
  { name: "mobile", width: 390, height: 900, reducedMotion: "no-preference" },
  { name: "desktop-reduced", width: 1440, height: 1000, reducedMotion: "reduce" },
];
const richFixtureProfiles = profiles.filter((profile) => profile.name === "desktop" || profile.name === "mobile");
const includeRichFixtures = process.env.VISUAL_QA_RICH_FIXTURES !== "false";

function formatRoute(route) {
  return route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
}

async function launchBrowser() {
  const requestedChannel = process.env.VISUAL_QA_BROWSER_CHANNEL;
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
      errors.push(`${attempt.label}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }

  throw new Error(`Could not launch a browser. Tried ${errors.join(" | ")}`);
}

function summarizeErrors(logs) {
  return logs
    .filter((log) => {
      const text = log.text || "";
      return log.type === "error" || log.type === "pageerror" || /hydration|hydrated|mismatch|failed|error/i.test(text);
    })
    .map((log) => ({ type: log.type, text: (log.text || "").slice(0, 700) }));
}

async function collectMetrics(page, expectedReducedMotion) {
  return page.evaluate((reducedMotionPreference) => {
    const bodyText = document.body.innerText || "";
    const visibleOverlayCount = [...document.querySelectorAll("nextjs-portal, [data-nextjs-dialog-overlay]")].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
    }).length;
    const overflowElements = [...document.querySelectorAll("body *")]
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: (element.textContent || "").trim().slice(0, 90),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }));
    const buttonOverflow = [...document.querySelectorAll("button,a")].filter((element) => element.scrollWidth > element.clientWidth + 1).length;
    const clippedControls = [...document.querySelectorAll("button,a,input,textarea,select")].filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && (rect.right > window.innerWidth + 1 || rect.left < -1);
    }).length;
    const animatedInlineStyleCount = [...document.querySelectorAll("[data-motion]")].filter((element) => {
      const style = element.getAttribute("style") || "";
      return /opacity|translate|matrix|scale\(/i.test(style);
    }).length;
    const reducedMotionMatches = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return {
      title: document.querySelector("h1")?.textContent?.trim() || "",
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1 || document.body.scrollWidth > window.innerWidth + 1,
      overflowElements,
      buttonOverflow,
      clippedControls,
      overlayIssueVisible: bodyText.includes("1 Issue") || visibleOverlayCount > 0,
      animatedInlineStyleCount,
      reducedMotionMatches,
      reducedMotionExpected: reducedMotionPreference === "reduce",
    };
  }, expectedReducedMotion);
}

async function captureCurrentState(page, entry, expectedReducedMotion) {
  try {
    await page.screenshot({ path: entry.screenshotPath, fullPage: true });
  } catch {
    // Keep the original failure as the useful signal.
  }

  try {
    entry.metrics = await collectMetrics(page, expectedReducedMotion);
  } catch {
    // The page may not have reached a usable DOM state.
  }
}

function meta() {
  return { model: "visual-qa", latencyMs: 12, tokensInput: null, tokensOutput: null };
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

function reviewItem(id, sourceType, content, extra = {}) {
  const now = "2026-06-24T09:00:00.000Z";
  return {
    id,
    sourceType,
    sourceId: null,
    missionId: null,
    content,
    meaningVi: sourceType === "chunk" ? "Ban co the lam ro han chot khong?" : null,
    example: "Could you clarify the deadline so I can prioritize the task?",
    errorPattern: sourceType === "error" ? "responsible to" : null,
    correctForm: sourceType === "error" ? "responsible for" : null,
    nextReviewAt: now,
    reviewCount: sourceType === "error" ? 2 : 0,
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

async function setupReviewRichFixture(page) {
  let items = [
    reviewItem("00000000-0000-4000-8000-000000000001", "error", "responsible to", {
      example: "I am responsible for clarifying the scope before Friday.",
    }),
    reviewItem("00000000-0000-4000-8000-000000000002", "chunk", "Could you clarify the deadline?"),
    reviewItem("00000000-0000-4000-8000-000000000003", "vocabulary", "handoff", {
      meaningVi: "ban giao cong viec",
      example: "The handoff note explains the next action clearly.",
    }),
  ];

  await page.route("**/api/review**", async (route) => {
    if (route.request().method() === "GET") {
      await fulfillJson(route, apiResponse({ items, source: "supabase" }));
      return;
    }

    const body = route.request().postDataJSON();
    const item = items.find((candidate) => candidate.id === body.itemId) || items[0];
    items = items.filter((candidate) => candidate.id !== body.itemId);
    await fulfillJson(route, apiResponse({
      saved: true,
      table: "review_items",
      id: body.itemId,
      item: { ...item, reviewCount: item.reviewCount + 1, nextReviewAt: "2026-06-25T09:00:00.000Z" },
    }));
  });
}

async function setupSpeakingRichFixture(page) {
  await page.route("**/api/ai/speaking", async (route) => {
    const body = route.request().postDataJSON();
    if (body.mode === "roleplay" && (!body.messages || body.messages.length === 0)) {
      await fulfillJson(route, agentResponse({
        reply: "You are in a standup. Explain the blocker clearly.",
        nextQuestion: "What is blocking your task today?",
        expectedFocus: "clarify blocker",
        suggestedChunks: ["I am blocked by", "Could you clarify"],
      }, { saved: true, status: "started", currentStep: "roleplay", id: "visual-mission-attempt" }));
      return;
    }

    if (body.mode === "roleplay") {
      await fulfillJson(route, agentResponse({
        reply: "Thanks. Could you share the next step with the team?",
        nextQuestion: "What will you say next?",
        expectedFocus: "next action",
        suggestedChunks: ["I will update", "after I confirm"],
      }, { saved: true, status: "started", currentStep: "roleplay", id: "visual-mission-attempt" }));
      return;
    }

    if (body.mode === "feedback") {
      await fulfillJson(route, agentResponse({
        scores: { taskCompletion: 4, fluency: 4, accuracy: 3, vocabulary: 4, interaction: 3 },
        mainIssue: "Use responsible for and add one clear next action for the team.",
        evidence: ["responsible to clarify", "missing update timing"],
        betterAnswer: "I am responsible for clarifying the blocker, and I will update the team after I confirm the scope.",
        deliverySignals: {
          inputMode: body.inputMode || "voice",
          lengthSignal: "The answer is long enough to evaluate the mission.",
          paceSignal: "The delivery pace is steady for workplace practice.",
          transcriptSignal: body.voiceMetrics?.transcriptEdited ? "The voice transcript was edited before feedback." : "The transcript was submitted directly.",
          nextVoiceAction: "Shadow the better answer, then retry with one clear next action.",
        },
        retryTask: {
          prompt: "Rewrite your answer with one clear next action.",
          requiredChunks: ["responsible for", "I will update"],
          successCriteria: ["clear next action"],
        },
        reviewCandidates: [{ type: "error", content: "responsible to", correctForm: "responsible for" }],
      }, { saved: true, status: "started", currentStep: "feedback", id: "visual-speaking-attempt", speakingAttemptId: "visual-speaking-attempt", reviewItemsCreated: 1 }));
      return;
    }

    await fulfillJson(route, agentResponse({
      improved: true,
      comparisonVi: "Cau tra loi moi ro hon, dung collocation va co hanh dong tiep theo.",
      scores: { taskCompletion: 5, fluency: 4, accuracy: 4, vocabulary: 5, interaction: 4 },
      remainingIssue: "Keep the final update concise.",
      nextAction: "Practice one more blocker update with a deadline.",
      deliverySignals: {
        inputMode: body.inputMode || "voice",
        lengthSignal: "The retry is focused and complete.",
        paceSignal: "The retry pace is steady enough for a standup update.",
        transcriptSignal: body.voiceMetrics?.transcriptEdited ? "Transcript was edited before retry feedback." : "Transcript was submitted directly.",
        nextVoiceAction: "Repeat the retry once tomorrow before starting the next mission.",
      },
      reviewCandidates: [{ type: "chunk", content: "I will update the team" }],
    }, { saved: true, status: "completed", currentStep: "review", id: "visual-retry-attempt", speakingAttemptId: "visual-retry-attempt", reviewItemsCreated: 2 }));
  });
}

async function setupConversationRichFixture(page) {
  let replyCount = 0;
  await page.route("**/api/history**", async (route) => {
    await fulfillJson(route, apiResponse({ items: [], source: "empty", reason: "Visual QA fixture." }));
  });
  await page.route("**/api/ai/conversation", async (route) => {
    const body = route.request().postDataJSON();
    if (body.mode === "summary") {
      await fulfillJson(route, agentResponse({
        summaryVi: "Ban da tra loi ro hon, them next action va hoi lai khi can lam ro yeu cau.",
        strengths: ["Clear workplace context", "Better next action"],
        mistakesToReview: ["Use responsible for"],
        suggestedNextPractice: "Practice one more deadline clarification.",
        score: 86,
      }));
      return;
    }

    replyCount += 1;
    const replies = [
      {
        reply: "Let's start with a workplace blocker.",
        correction: "Start by answering the first question.",
        naturalAnswer: "I can explain the blocker clearly.",
        nextQuestion: "What is one blocker today?",
        score: 78,
      },
      {
        reply: "Good. Add who needs the update and when.",
        correction: "Say responsible for, not responsible to.",
        naturalAnswer: "I am responsible for clarifying the scope before Friday.",
        nextQuestion: "How will you update the team?",
        score: 84,
      },
      {
        reply: "Nice. Keep the final update short.",
        correction: "Add a concrete time for the update.",
        naturalAnswer: "I will update the team after I confirm the scope this afternoon.",
        nextQuestion: "What question will you ask your manager?",
        score: 88,
      },
    ];
    await fulfillJson(route, agentResponse(replies[Math.min(replyCount - 1, replies.length - 1)]));
  });
}

async function setupReflexRichFixture(page) {
  const questions = Array.from({ length: 10 }, (_, index) => "Mock reflex workplace question " + (index + 1) + "?");
  let feedbackCount = 0;
  await page.route("**/api/ai/reflex", async (route) => {
    const body = route.request().postDataJSON();
    if (body.mode === "questions") {
      await fulfillJson(route, agentResponse({ questions }));
      return;
    }

    feedbackCount += 1;
    await fulfillJson(route, agentResponse({
      correction: "Use a complete short answer with one workplace detail.",
      naturalAnswer: "I will update the team after I clarify the scope.",
      nextQuestion: questions[Math.min(feedbackCount, questions.length - 1)],
      score: 80 + feedbackCount,
    }));
  });
}

function fixtureVocabularyItems(topic, count = 8) {
  const words = [
    ["alignment", "su thong nhat", "We need alignment before we change the timeline.", "Use it when teams need the same direction."],
    ["scope", "pham vi cong viec", "The scope is clear after the planning meeting.", "Useful when clarifying what is included."],
    ["blocker", "tro ngai", "The blocker is waiting for design approval.", "Use it in standups and progress updates."],
    ["handoff", "ban giao", "The handoff note explains the next owner.", "Helpful when work moves between people."],
    ["priority", "uu tien", "This bug is the top priority today.", "Use it when comparing urgent tasks."],
    ["deadline", "han chot", "Could you confirm the deadline for this release?", "Pair it with confirm or clarify."],
    ["estimate", "uoc tinh", "My estimate is two more days.", "Use it for time and effort predictions."],
    ["follow-up", "theo doi tiep", "I will send a follow-up after the call.", "Good for professional next actions."],
  ];

  return words.slice(0, count).map(([word, meaningVi, example, usageNoteVi]) => ({
    word,
    meaningVi,
    example,
    topic,
    usageNoteVi,
  }));
}

function fixtureDailyLesson() {
  return {
    title: "Daily standup clarity",
    level: "A2",
    vocabulary: fixtureVocabularyItems("standup", 5),
    sentencePatterns: [
      {
        pattern: "I am responsible for...",
        meaningVi: "Dung de noi phan viec minh phu trach.",
        example: "I am responsible for clarifying the scope before Friday.",
      },
      {
        pattern: "The main blocker is...",
        meaningVi: "Dung de noi tro ngai chinh.",
        example: "The main blocker is waiting for design approval.",
      },
      {
        pattern: "I will update the team after...",
        meaningVi: "Dung de noi hanh dong tiep theo.",
        example: "I will update the team after I confirm the deadline.",
      },
    ],
    speakingQuestions: [
      "What are you responsible for this week?",
      "What is one blocker in your current task?",
      "How will you update the team after you clarify the scope?",
      "What question should you ask when the requirement is unclear?",
    ],
    writingTask: "Write a four-sentence standup update with one blocker, one next action, and one clarification question.",
    exercises: [
      { prompt: "I am responsible ___ the release note.", answer: "for" },
      { prompt: "The main blocker ___ unclear scope.", answer: "is" },
      { prompt: "I will update the team ___ I confirm the deadline.", answer: "after" },
    ],
    summaryVi: "Bai hoc tap trung vao cach noi standup ngan gon, ro blocker, dung collocation va them next action.",
  };
}

async function setupDailyRichFixture(page) {
  await page.route("**/api/ai/daily-lesson", async (route) => {
    await fulfillJson(route, agentResponse(fixtureDailyLesson(), {
      saved: true,
      table: "daily_lessons",
      id: "visual-daily-lesson",
    }));
  });
  await page.route("**/api/progress/complete-lesson", async (route) => {
    await fulfillJson(route, apiResponse({ saved: true, table: "lesson_attempts", id: "visual-lesson-attempt" }));
  });
}

async function setupVocabularyRichFixture(page) {
  await page.route("**/api/history**", async (route) => {
    await fulfillJson(route, apiResponse({
      items: [
        {
          id: "visual-vocab-1",
          word: "alignment",
          meaningVi: "su thong nhat",
          example: "We need alignment before changing the deadline.",
          topic: "meetings",
          reviewCount: 2,
          nextReviewAt: "2026-06-25T09:00:00.000Z",
        },
        {
          id: "visual-vocab-2",
          word: "handoff",
          meaningVi: "ban giao",
          example: "The handoff note explains the next owner.",
          topic: "teamwork",
          reviewCount: 1,
          nextReviewAt: "2026-06-26T09:00:00.000Z",
        },
      ],
      source: "supabase",
    }));
  });
  await page.route("**/api/ai/vocabulary", async (route) => {
    await fulfillJson(route, agentResponse({
      topic: "meetings",
      items: fixtureVocabularyItems("meetings", 8),
    }, { saved: true, table: "vocabulary_items", id: "visual-vocab-batch" }));
  });
}

async function setupGrammarRichFixture(page) {
  await page.route("**/api/ai/grammar", async (route) => {
    await fulfillJson(route, agentResponse({
      topic: "Present perfect for workplace updates",
      explanationVi: "Dung present perfect khi noi ve viec da hoan thanh va ket qua van quan trong hien tai.",
      dailyExamples: [
        "I have finished the task.",
        "She has sent the update.",
        "We have already discussed the blocker.",
      ],
      workExamples: [
        "I have clarified the requirement with the product manager.",
        "The team has reviewed the release checklist.",
        "We have not confirmed the final deadline yet.",
      ],
      exercise: [
        { question: "Complete: I ___ finished the bug fix.", answer: "have" },
        { question: "Rewrite: I sent the update already.", answer: "I have already sent the update." },
        { question: "Complete: We ___ not confirmed the scope yet.", answer: "have" },
      ],
    }));
  });
}

async function setupCorrectionRichFixture(page) {
  await page.route("**/api/history**", async (route) => {
    await fulfillJson(route, apiResponse({
      items: [
        {
          id: "visual-correction-1",
          originalText: "I am responsible to build feature.",
          naturalText: "I am responsible for building the feature.",
          score: 82,
          createdAt: "2026-06-24T09:00:00.000Z",
        },
      ],
      source: "supabase",
    }));
  });
  await page.route("**/api/ai/correction", async (route) => {
    await fulfillJson(route, agentResponse({
      original: "I am responsible to build feature and fix bug for my team.",
      corrected: "I am responsible for building the feature and fixing bugs for my team.",
      natural: "I am responsible for building the feature and fixing bugs for my team.",
      mistakes: [
        {
          text: "responsible to",
          issue: "Wrong collocation after responsible.",
          fix: "responsible for",
          explanationVi: "Sau responsible, dung for khi noi ve viec minh phu trach.",
        },
        {
          text: "build feature",
          issue: "Missing article and gerund form.",
          fix: "building the feature",
          explanationVi: "Sau responsible for can danh tu hoac V-ing.",
        },
        {
          text: "fix bug",
          issue: "Countable noun needs plural or article.",
          fix: "fixing bugs",
          explanationVi: "Bug la danh tu dem duoc, nen dung bugs khi noi chung.",
        },
      ],
      score: 82,
    }, { saved: true, table: "corrections", id: "visual-correction" }));
  });
}

async function setupAssessmentRichFixture(page) {
  await page.route("**/api/history**", async (route) => {
    await fulfillJson(route, apiResponse({
      items: [
        {
          id: "visual-assessment-1",
          level: "A2",
          strengths: ["Clear basic vocabulary", "Can ask for clarification"],
          weaknesses: ["Needs stronger sentence control", "Limited interaction phrases"],
          createdAt: "2026-06-23T09:00:00.000Z",
        },
      ],
      source: "supabase",
    }));
  });
  await page.route("**/api/ai/assessment", async (route) => {
    await fulfillJson(route, agentResponse({
      level: "B1",
      scores: {
        vocabulary: 76,
        grammar: 68,
        communication: 72,
        writing: 70,
      },
      strengths: [
        "You can explain routine work with clear basic vocabulary.",
        "You can ask simple clarification questions in workplace contexts.",
        "Your writing has enough detail for short updates.",
      ],
      weaknesses: [
        "You need more accurate collocations such as responsible for and blocked by.",
        "You need more follow-up questions to keep a conversation active.",
        "You should connect ideas with because, after, and before more consistently.",
      ],
      nextSevenDays: [
        { day: 1, focus: "Clarify responsibilities", task: "Describe your role using responsible for and mainly work on." },
        { day: 2, focus: "Explain blockers", task: "Give a short blocker update with one next action." },
        { day: 3, focus: "Ask follow-up questions", task: "Practice three ways to clarify requirements." },
        { day: 4, focus: "Report progress", task: "Use already, not yet, and still in progress." },
        { day: 5, focus: "Give an opinion", task: "State one opinion and one reason in a product discussion." },
        { day: 6, focus: "Small talk", task: "Answer two casual workplace questions naturally." },
        { day: 7, focus: "Mini assessment", task: "Combine role, progress, blocker, and next plan in one answer." },
      ],
    }, { saved: true, table: "assessments", id: "visual-assessment" }));
  });
}

const richFixtures = [
  {
    name: "progress-rich",
    route: "/progress?visualFixture=rich&tab=trend",
    waitFor: async (page) => {
      await page.getByText("Recent rubric average").waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "review-rich",
    route: "/review",
    setupPage: setupReviewRichFixture,
    waitFor: async (page) => {
      await page.getByRole("heading", { name: "responsible to", exact: true }).waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "speaking-rich",
    route: "/speaking",
    setupPage: setupSpeakingRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Start Roleplay" }).click();
      await page.getByText("What is blocking your task today?").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#speaking-roleplay-answer").fill("I am responsible to clarify the blocker.");
      await page.getByRole("button", { name: "Send" }).click();
      await page.getByText("What will you say next?").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#speaking-feedback-action").click();
      await page.getByText("Rubric signal").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#speaking-retry-answer").fill("I am responsible for clarifying the blocker, and I will update the team after I confirm scope.");
      await page.getByRole("button", { name: "Check Retry" }).click();
    },
    waitFor: async (page) => {
      await page.getByText("Mission complete").waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "speaking-voice-unsupported",
    route: "/speaking?tab=roleplay",
    setupPage: async (page) => {
      await page.addInitScript(() => {
        Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
        Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
      });
    },
    exercisePage: async (page) => {
      await page.getByLabel("Voice transcript").getByRole("button", { name: "Record" }).click();
    },
    waitFor: async (page) => {
      await page.getByText("Unavailable").first().waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "conversation-rich",
    route: "/conversation",
    setupPage: setupConversationRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Start", exact: true }).click();
      await page.getByText("What is one blocker today?").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#conversation-answer").fill("I am responsible to clarify the scope.");
      await page.locator("#conversation-answer").press("Enter");
      await page.getByText("How will you update the team?").waitFor({ state: "visible", timeout: 10000 });
      await page.locator("#conversation-answer").fill("I will update the team after I confirm the scope.");
      await page.locator("#conversation-answer").press("Enter");
      await page.getByText("What question will you ask your manager?").waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: "Stop & Summary" }).click();
    },
    waitFor: async (page) => {
      await page.getByText("Practice one more deadline clarification.").waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "reflex-rich",
    route: "/reflex",
    setupPage: setupReflexRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Generate Drill", exact: true }).click();
      await page.getByText("Mock reflex workplace question 1?").waitFor({ state: "visible", timeout: 10000 });
      for (let index = 1; index <= 3; index += 1) {
        await page.locator("#reflex-answer").fill("I will clarify it today " + index + ".");
        await page.locator("#reflex-answer").press("Enter");
        await page.waitForFunction(
          (expectedText) => document.body.innerText.includes(expectedText),
          "Answered " + index + " of 10",
          { timeout: 10000 },
        );
      }
    },
    waitFor: async (page) => {
      await page.waitForFunction(() => document.body.innerText.includes("Answered 3 of 10"), null, { timeout: 10000 });
    },
  },
  {
    name: "daily-rich",
    route: "/daily",
    setupPage: setupDailyRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Generate", exact: true }).click();
      await page.getByText("Daily standup clarity").waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("tab", { name: "Practice" }).click();
      await page.getByRole("button", { name: "Complete Lesson" }).click();
    },
    waitFor: async (page) => {
      await page.getByText("Lesson completed and progress updated.").waitFor({ state: "visible", timeout: 10000 });
      await page.waitForTimeout(3200);
    },
  },
  {
    name: "vocabulary-rich",
    route: "/vocabulary",
    setupPage: setupVocabularyRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Generate", exact: true }).click();
    },
    waitFor: async (page) => {
      await page.getByText("alignment").first().waitFor({ state: "visible", timeout: 10000 });
      await page.getByText("8 item(s)").waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "grammar-rich",
    route: "/grammar",
    setupPage: setupGrammarRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Generate", exact: true }).click();
    },
    waitFor: async (page) => {
      await page.getByText("Present perfect for workplace updates").waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "correction-rich",
    route: "/correction",
    setupPage: setupCorrectionRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Correct", exact: true }).click();
    },
    waitFor: async (page) => {
      await page.getByText("responsible for").first().waitFor({ state: "visible", timeout: 10000 });
      await page.getByText("Feedback ready").waitFor({ state: "visible", timeout: 10000 });
    },
  },
  {
    name: "assessment-rich",
    route: "/assessment",
    setupPage: setupAssessmentRichFixture,
    exercisePage: async (page) => {
      await page.getByRole("button", { name: "Assess", exact: true }).click();
    },
    waitFor: async (page) => {
      await page.getByText("B1").first().waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("tab", { name: "Plan" }).click();
      await page.getByRole("heading", { name: "Next 7 days", exact: true }).waitFor({ state: "visible", timeout: 10000 });
    },
  },
];

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

await mkdir(outputDir, { recursive: true });

let ownedServer = null;
if (!(await checkServer())) {
  if (!canStartLocalServer()) {
    console.error("FAIL visual QA server check: " + baseUrl + " is not reachable. Start the app first, or set VISUAL_QA_BASE_URL.");
    process.exit(1);
  }
  console.log("Visual QA starting local dev server at " + baseUrl + "...");
  ownedServer = startLocalServer();
  if (!(await waitForServer())) {
    stopLocalServer(ownedServer);
    console.error("FAIL visual QA server check: " + baseUrl + " did not become ready. See " + path.join(outputDir, "dev-server.log"));
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
      reducedMotion: profile.reducedMotion,
    });
    const page = await context.newPage();
    const logs = [];
    page.on("console", (message) => logs.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));

    const entry = {
      route,
      profile: profile.name,
      status: null,
      screenshotPath: path.join(outputDir, `${formatRoute(route)}-${profile.name}.png`),
      metrics: null,
      errors: [],
    };

    try {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 45000 });
      entry.status = response?.status() ?? null;
      await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 1800);
      await page.screenshot({ path: entry.screenshotPath, fullPage: true });

      entry.metrics = await collectMetrics(page, profile.reducedMotion);
    } catch (error) {
      entry.errors.push({ type: "navigation", text: error instanceof Error ? error.message : String(error) });
      await captureCurrentState(page, entry, profile.reducedMotion);
    }

    entry.errors.push(...summarizeErrors(logs));
    results.push(entry);
    await context.close();
  }
}

if (includeRichFixtures) {
  for (const fixture of richFixtures) {
    for (const profile of richFixtureProfiles) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        deviceScaleFactor: 1,
        reducedMotion: profile.reducedMotion,
      });
      const page = await context.newPage();
      const logs = [];
      page.on("console", (message) => logs.push({ type: message.type(), text: message.text() }));
      page.on("pageerror", (error) => logs.push({ type: "pageerror", text: error.message }));

      const entry = {
        route: fixture.route,
        fixture: fixture.name,
        profile: profile.name,
        status: null,
        screenshotPath: path.join(outputDir, `${fixture.name}-${profile.name}.png`),
        metrics: null,
        errors: [],
      };

      try {
        await fixture.setupPage?.(page);
        const response = await page.goto(`${baseUrl}${fixture.route}`, { waitUntil: "networkidle", timeout: 45000 });
        entry.status = response?.status() ?? null;
        await fixture.exercisePage?.(page);
        await fixture.waitFor?.(page);
        await page.waitForTimeout(Number.isFinite(waitMs) ? waitMs : 1800);
        await page.screenshot({ path: entry.screenshotPath, fullPage: true });
        entry.metrics = await collectMetrics(page, profile.reducedMotion);
      } catch (error) {
        entry.errors.push({ type: "fixture", text: error instanceof Error ? error.message : String(error) });
        await captureCurrentState(page, entry, profile.reducedMotion);
      }

      entry.errors.push(...summarizeErrors(logs));
      results.push(entry);
      await context.close();
    }
  }
}

await browser.close();
stopLocalServer(ownedServer);

const failures = results.filter((entry) => {
  if (entry.status === null || entry.status >= 400) return true;
  if (entry.errors.length > 0) return true;
  if (!entry.metrics) return true;
  if (entry.metrics.title.length === 0) return true;
  if (entry.metrics.hasHorizontalOverflow) return true;
  if (entry.metrics.buttonOverflow > 0 || entry.metrics.clippedControls > 0) return true;
  if (entry.metrics.overlayIssueVisible) return true;
  if (entry.metrics.reducedMotionExpected && !entry.metrics.reducedMotionMatches) return true;
  return false;
});

const report = {
  baseUrl,
  browser: browserLabel,
  outputDir,
  waitMs,
  routeCount: activeRoutes.length,
  profileCount: profiles.length,
  fixtureCount: includeRichFixtures ? richFixtures.length : 0,
  checkedAt: new Date().toISOString(),
  failures: failures.map((entry) => ({
    route: entry.route,
    profile: entry.profile,
    status: entry.status,
    errors: entry.errors,
    metrics: entry.metrics,
    screenshotPath: entry.screenshotPath,
  })),
  results,
};

const reportPath = path.join(outputDir, "report.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));

for (const entry of results) {
  const ok = !failures.includes(entry);
  const label = entry.fixture ? `${entry.fixture} ${entry.route}` : entry.route;
  console.log(`${ok ? "OK" : "FAIL"} ${entry.profile} ${label} HTTP ${entry.status ?? "--"} ${entry.screenshotPath}`);
}

console.log(`Visual QA report: ${reportPath}`);

const exitCode = failures.length ? 1 : 0;
if (failures.length) {
  console.error("Visual QA failed: " + failures.length + " page/profile check(s) need attention.");
} else {
  console.log("Visual QA passed: " + results.length + " page/profile check(s).");
}
process.exit(exitCode);
