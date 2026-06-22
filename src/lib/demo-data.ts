export const dashboardStats = [
  { label: "Current day", value: "Day 1", detail: "30-day plan", tone: "brand" },
  { label: "Streak", value: "0", detail: "Start today", tone: "coral" },
  { label: "Minutes", value: "0", detail: "No sessions yet", tone: "amber" },
  { label: "Average score", value: "--", detail: "After first lesson", tone: "violet" },
];

export const todayTasks = [
  {
    title: "Generate today's lesson",
    detail: "Vocabulary, patterns, speaking prompts, writing task.",
    href: "/daily",
  },
  {
    title: "Fix one paragraph",
    detail: "Paste work-related English and get Vietnamese explanations.",
    href: "/correction",
  },
  {
    title: "Run a short conversation",
    detail: "Easy, Normal, or Hard mode with summary.",
    href: "/conversation",
  },
];

export const weeklyProgress = [
  { day: "Mon", minutes: 0 },
  { day: "Tue", minutes: 0 },
  { day: "Wed", minutes: 0 },
  { day: "Thu", minutes: 0 },
  { day: "Fri", minutes: 0 },
  { day: "Sat", minutes: 0 },
  { day: "Sun", minutes: 0 },
];

export const sampleDailyLesson = {
  title: "Day 1 - Introduce your work clearly",
  vocabulary: [
    { word: "deadline", meaning: "han chot", example: "We need to meet the deadline." },
    { word: "priority", meaning: "uu tien", example: "This task is my top priority." },
    { word: "handoff", meaning: "ban giao", example: "I will prepare a clean handoff." },
  ],
  patterns: [
    "I am responsible for ...",
    "My current priority is ...",
    "Could you clarify ...?",
  ],
  speakingQuestions: [
    "What are you working on today?",
    "What is your biggest priority this week?",
    "Can you explain your role in one sentence?",
  ],
  writingTask: "Write 4-5 sentences introducing your work and today's priority.",
};
