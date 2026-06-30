const baseUrl = process.env.LOCAL_APP_URL || "http://localhost:3001";
const persistenceCases = new Set([
  "speaking-roleplay",
  "speaking-feedback",
  "speaking-retry-feedback",
]);

const cases = [
  [
    "daily-lesson",
    "/api/ai/daily-lesson",
    {
      dayNumber: 4,
      level: "A2",
      jobRole: "software developer",
      focus: "standup updates",
    },
  ],
  [
    "conversation-reply",
    "/api/ai/conversation",
    {
      mode: "reply",
      difficulty: "Easy",
      messages: [{ role: "user", content: "I worked on a bug today." }],
    },
  ],
  [
    "conversation-summary",
    "/api/ai/conversation",
    {
      mode: "summary",
      difficulty: "Easy",
      messages: [
        { role: "user", content: "I fixed a login issue." },
        { role: "assistant", content: "Nice. What was the root cause?" },
      ],
    },
  ],
  [
    "vocabulary",
    "/api/ai/vocabulary",
    { jobRole: "software developer", topic: "daily standup" },
  ],
  [
    "grammar",
    "/api/ai/grammar",
    { topic: "present perfect", level: "A2" },
  ],
  [
    "reflex-questions",
    "/api/ai/reflex",
    { mode: "questions", topic: "work updates" },
  ],
  [
    "reflex-feedback",
    "/api/ai/reflex",
    {
      mode: "feedback",
      topic: "work updates",
      question: "What did you finish today?",
      answer: "I finish the login bug.",
    },
  ],
  [
    "assessment",
    "/api/ai/assessment",
    {
      vocabularyAnswers: "Deploy means put an app online.",
      grammarAnswers: "I have fixed two bugs.",
      communicationAnswers: "I can explain blockers in standup.",
      writingSample: "Yesterday I fixed a login bug and tested it carefully.",
    },
  ],
  [
    "speaking-roleplay",
    "/api/ai/speaking",
    {
      mode: "roleplay",
      missionId: "workplace-day-01-introduce-yourself",
      messages: [],
    },
  ],
  [
    "speaking-feedback",
    "/api/ai/speaking",
    {
      mode: "feedback",
      missionId: "workplace-day-01-introduce-yourself",
      prompt: "Introduce yourself to a new teammate.",
      userAnswer:
        "Hi, I am Minh. I mainly work on backend features, and right now I am focusing on fixing login issues.",
      roleplayMessages: [],
    },
  ],
  [
    "speaking-retry-feedback",
    "/api/ai/speaking",
    {
      mode: "retry-feedback",
      missionId: "workplace-day-01-introduce-yourself",
      originalAnswer: "I am Minh. I work backend.",
      retryAnswer:
        "Hi, I am Minh. I mainly work on backend features, and I am responsible for improving the login flow this week.",
    },
  ],
];

let hasFailure = false;

for (const [name, path, body] of cases) {
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json().catch(() => null);
    const persistenceOk =
      !persistenceCases.has(name) || json?.data?.persistence?.saved === true;
    const ok = response.ok && json?.ok === true && persistenceOk;
    const model = json?.data?.meta?.model ? ` ${json.data.meta.model}` : "";
    console.log(`${ok ? "OK" : "FAIL"} ${name} HTTP ${response.status}${model} ${Date.now() - startedAt}ms`);
    if (!ok) {
      hasFailure = true;
      console.log(JSON.stringify(json?.error ?? json?.data?.persistence ?? json, null, 2));
      break;
    }
  } catch (error) {
    hasFailure = true;
    console.log(`FAIL ${name} ${error instanceof Error ? error.message : String(error)}`);
    break;
  }
}

if (hasFailure) {
  process.exitCode = 1;
}
