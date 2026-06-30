import { getCurrentUser } from "@/lib/supabase/server";
import { weeklyProgress } from "@/lib/demo-data";

export type RubricSkillKey =
  | "taskCompletion"
  | "fluency"
  | "accuracy"
  | "vocabulary"
  | "interaction";

export type RubricSkillProgress = {
  key: RubricSkillKey;
  label: string;
  average: number | null;
  latest: number | null;
  delta: number | null;
  attempts: number;
  guidance: string;
};

export type RubricTrendPoint = {
  id: string;
  label: string;
  step: string;
  createdAt: string;
  scores: Record<RubricSkillKey, number | null>;
};

export type VoiceConsistencySummary = {
  voiceAttempts: number;
  voiceMissions: number;
  averageWordsPerMinute: number | null;
  wpmBand: "not_enough_data" | "slow" | "steady" | "fast";
  retryImprovements: number;
  transcriptEditRate: number | null;
  lastVoiceAttemptAt: string | null;
};

export type ProgressSummary = {
  completedLessons: number;
  completedMissions: number;
  speakingAttempts: number;
  dueReviewItems: number;
  vocabularyItems: number;
  corrections: number;
  conversations: number;
  averageScore: number | null;
  rubricAverage: number | null;
  strongestSkill: RubricSkillProgress | null;
  weakestSkill: RubricSkillProgress | null;
  rubricSkills: RubricSkillProgress[];
  rubricTrend: RubricTrendPoint[];
  voiceConsistency: VoiceConsistencySummary;
  totalMinutes: number;
  weeklyMinutes: Array<{ day: string; minutes: number }>;
  source: "supabase" | "empty";
  reason?: string;
};

type ScoreRow = {
  id?: string | null;
  step?: string | null;
  current_step?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  completed_at?: string | null;
  score_task?: number | null;
  score_fluency?: number | null;
  score_accuracy?: number | null;
  score_vocabulary?: number | null;
  score_interaction?: number | null;
};

type VoiceDeliveryRow = {
  id: string;
  mission_id?: string | null;
  step?: string | null;
  feedback_json?: unknown;
  delivery_json?: unknown;
  created_at?: string | null;
};

type DeliveryJson = {
  inputMode?: unknown;
  voiceMetrics?: {
    wordsPerMinute?: unknown;
    transcriptEdited?: unknown;
  } | null;
};

const rubricFields: Array<{
  key: RubricSkillKey;
  label: string;
  column: keyof ScoreRow;
  guidance: string;
}> = [
  {
    key: "taskCompletion",
    label: "Task completion",
    column: "score_task",
    guidance: "Can you finish the speaking mission clearly?",
  },
  {
    key: "fluency",
    label: "Fluency",
    column: "score_fluency",
    guidance: "Can you connect ideas without stopping too early?",
  },
  {
    key: "accuracy",
    label: "Accuracy",
    column: "score_accuracy",
    guidance: "Are grammar, sentence patterns, and collocations controlled?",
  },
  {
    key: "vocabulary",
    label: "Vocabulary",
    column: "score_vocabulary",
    guidance: "Are target chunks and workplace words active?",
  },
  {
    key: "interaction",
    label: "Interaction",
    column: "score_interaction",
    guidance: "Can you ask, clarify, confirm, and extend the conversation?",
  },
];

function getScore(row: ScoreRow, column: keyof ScoreRow) {
  const value = row[column];
  return typeof value === "number" ? value : null;
}

function average(values: number[]) {
  return values.length
    ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
    : null;
}

function buildRubricSkills(rows: ScoreRow[]): RubricSkillProgress[] {
  return rubricFields.map((field) => {
    const values = rows
      .map((row) => getScore(row, field.column))
      .filter((value): value is number => value !== null);
    const latest = values.at(-1) ?? null;
    const previous = values.length > 1 ? values.at(-2) ?? null : null;

    return {
      key: field.key,
      label: field.label,
      average: average(values),
      latest,
      delta: latest !== null && previous !== null ? latest - previous : null,
      attempts: values.length,
      guidance: field.guidance,
    };
  });
}

function buildRubricTrend(rows: ScoreRow[]): RubricTrendPoint[] {
  return rows
    .filter((row) => rubricFields.some((field) => getScore(row, field.column) !== null))
    .slice(-8)
    .map((row, index) => ({
      id: row.id ?? `trend-${index}`,
      label: `Attempt ${index + 1}`,
      step: row.step ?? row.current_step ?? "speaking",
      createdAt: row.created_at ?? row.completed_at ?? row.updated_at ?? new Date().toISOString(),
      scores: rubricFields.reduce(
        (scores, field) => ({
          ...scores,
          [field.key]: getScore(row, field.column),
        }),
        {} as Record<RubricSkillKey, number | null>,
      ),
    }));
}

function pickSkill(
  skills: RubricSkillProgress[],
  direction: "strongest" | "weakest",
) {
  const scoredSkills = skills.filter((skill) => skill.average !== null);
  if (!scoredSkills.length) {
    return null;
  }

  return scoredSkills.toSorted((first, second) =>
    direction === "strongest"
      ? (second.average ?? 0) - (first.average ?? 0)
      : (first.average ?? 0) - (second.average ?? 0),
  )[0];
}

function buildEmptyProgressSummary(reason?: string): ProgressSummary {
  const rubricSkills = buildRubricSkills([]);

  return {
    completedLessons: 0,
    completedMissions: 0,
    speakingAttempts: 0,
    dueReviewItems: 0,
    vocabularyItems: 0,
    corrections: 0,
    conversations: 0,
    averageScore: null,
    rubricAverage: null,
    strongestSkill: null,
    weakestSkill: null,
    rubricSkills,
    rubricTrend: [],
    voiceConsistency: buildVoiceConsistency([]),
    totalMinutes: 0,
    weeklyMinutes: weeklyProgress,
    source: "empty",
    reason,
  };
}

function parseDeliveryJson(value: unknown): DeliveryJson | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as DeliveryJson;
}

function getWpmBand(wpm: number | null): VoiceConsistencySummary["wpmBand"] {
  if (wpm === null) return "not_enough_data";
  if (wpm < 80) return "slow";
  if (wpm <= 150) return "steady";
  return "fast";
}

function buildVoiceConsistency(rows: VoiceDeliveryRow[]): VoiceConsistencySummary {
  const voiceRows = rows.filter((row) => parseDeliveryJson(row.delivery_json)?.inputMode === "voice");
  const wpmValues = voiceRows
    .map((row) => parseDeliveryJson(row.delivery_json)?.voiceMetrics?.wordsPerMinute)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const editedCount = voiceRows.filter((row) => parseDeliveryJson(row.delivery_json)?.voiceMetrics?.transcriptEdited === true).length;
  const retryImprovements = voiceRows.filter((row) => {
    if (row.step !== "retry") return false;
    const feedback = row.feedback_json;

    return Boolean(feedback && typeof feedback === "object" && !Array.isArray(feedback) && (feedback as { improved?: unknown }).improved === true);
  }).length;
  const averageWordsPerMinute = average(wpmValues);
  const missionIds = voiceRows
    .map((row) => row.mission_id)
    .filter((id): id is string => Boolean(id));

  return {
    voiceAttempts: voiceRows.length,
    voiceMissions: new Set(missionIds).size,
    averageWordsPerMinute,
    wpmBand: getWpmBand(averageWordsPerMinute),
    retryImprovements,
    transcriptEditRate: voiceRows.length
      ? Math.round((editedCount / voiceRows.length) * 100)
      : null,
    lastVoiceAttemptAt: voiceRows.at(-1)?.created_at ?? null,
  };
}

export function buildVisualFixtureProgressSummary(): ProgressSummary {
  const rows: ScoreRow[] = [
    {
      id: "fixture-speaking-1",
      step: "roleplay",
      created_at: "2026-06-20T08:00:00.000Z",
      score_task: 4,
      score_fluency: 3,
      score_accuracy: 3,
      score_vocabulary: 4,
      score_interaction: 2,
    },
    {
      id: "fixture-speaking-2",
      step: "retry",
      created_at: "2026-06-21T08:30:00.000Z",
      score_task: 5,
      score_fluency: 4,
      score_accuracy: 4,
      score_vocabulary: 4,
      score_interaction: 3,
    },
    {
      id: "fixture-speaking-3",
      step: "roleplay",
      created_at: "2026-06-22T09:00:00.000Z",
      score_task: 4,
      score_fluency: 4,
      score_accuracy: 3,
      score_vocabulary: 5,
      score_interaction: 2,
    },
    {
      id: "fixture-speaking-4",
      step: "retry",
      created_at: "2026-06-23T09:30:00.000Z",
      score_task: 5,
      score_fluency: 4,
      score_accuracy: 4,
      score_vocabulary: 5,
      score_interaction: 3,
    },
    {
      id: "fixture-speaking-5",
      step: "roleplay",
      created_at: "2026-06-24T10:00:00.000Z",
      score_task: 5,
      score_fluency: 4,
      score_accuracy: 5,
      score_vocabulary: 4,
      score_interaction: 2,
    },
  ];
  const rubricSkills = buildRubricSkills(rows);
  const rubricAverages = rubricSkills
    .map((skill) => skill.average)
    .filter((score): score is number => score !== null);

  return {
    completedLessons: 6,
    completedMissions: 5,
    speakingAttempts: rows.length,
    dueReviewItems: 8,
    vocabularyItems: 42,
    corrections: 13,
    conversations: 7,
    averageScore: 84,
    rubricAverage: average(rubricAverages),
    strongestSkill: pickSkill(rubricSkills, "strongest"),
    weakestSkill: pickSkill(rubricSkills, "weakest"),
    rubricSkills,
    rubricTrend: buildRubricTrend(rows),
    voiceConsistency: {
      voiceAttempts: 4,
      voiceMissions: 3,
      averageWordsPerMinute: 108,
      wpmBand: "steady",
      retryImprovements: 2,
      transcriptEditRate: 50,
      lastVoiceAttemptAt: "2026-06-24T10:00:00.000Z",
    },
    totalMinutes: 185,
    weeklyMinutes: [
      { day: "Mon", minutes: 18 },
      { day: "Tue", minutes: 24 },
      { day: "Wed", minutes: 32 },
      { day: "Thu", minutes: 28 },
      { day: "Fri", minutes: 35 },
      { day: "Sat", minutes: 20 },
      { day: "Sun", minutes: 28 },
    ],
    source: "supabase",
  };
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return buildEmptyProgressSummary("Supabase personal profile is unavailable.");
  }

  const [
    completedLessonsResult,
    completedMissionsResult,
    speakingAttemptsCountResult,
    dueReviewItemsResult,
    vocabularyItemsResult,
    correctionsResult,
    conversationsResult,
  ] = await Promise.all([
    supabase
      .from("lesson_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
    supabase
      .from("mission_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "completed"),
    supabase
      .from("speaking_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("review_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString()),
    supabase
      .from("vocabulary_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("corrections")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("practice_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "conversation"),
  ]);

  const completedLessons = completedLessonsResult.count ?? 0;
  const completedMissions = completedMissionsResult.count ?? 0;
  const speakingAttempts = speakingAttemptsCountResult.count ?? 0;
  const dueReviewItems = dueReviewItemsResult.count ?? 0;
  const vocabularyItems = vocabularyItemsResult.count ?? 0;
  const corrections = correctionsResult.count ?? 0;
  const conversations = conversationsResult.count ?? 0;
  const queryError =
    completedMissionsResult.error ??
    speakingAttemptsCountResult.error ??
    dueReviewItemsResult.error ??
    null;

  const { data: attempts } = await supabase
    .from("lesson_attempts")
    .select("score, minutes_spent, completed_at, created_at")
    .eq("user_id", user.id);

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("score, minutes_spent, created_at")
    .eq("user_id", user.id);

  const { data: missionAttempts } = await supabase
    .from("mission_attempts")
    .select(
      "id, status, current_step, score_task, score_fluency, score_accuracy, score_vocabulary, score_interaction, created_at, updated_at, completed_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: true });

  const { data: scoredSpeakingAttempts } = await supabase
    .from("speaking_attempts")
    .select(
      "id, step, score_task, score_fluency, score_accuracy, score_vocabulary, score_interaction, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const voiceDeliveryRowsResult = await supabase
    .from("speaking_attempts")
    .select("id, mission_id, step, feedback_json, delivery_json, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  let voiceDeliveryRows = (voiceDeliveryRowsResult.data ?? []) as VoiceDeliveryRow[];

  if (voiceDeliveryRowsResult.error && /delivery_json/i.test(voiceDeliveryRowsResult.error.message)) {
    const fallbackVoiceDeliveryRowsResult = await supabase
      .from("speaking_attempts")
      .select("id, mission_id, step, feedback_json, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    voiceDeliveryRows = (fallbackVoiceDeliveryRowsResult.data ?? []) as VoiceDeliveryRow[];
  }

  const scores = [
    ...(attempts ?? []).map((item) => item.score),
    ...(sessions ?? []).map((item) => item.score),
  ].filter((score): score is number => typeof score === "number");

  const totalMinutes = [
    ...(attempts ?? []).map((item) => item.minutes_spent ?? 0),
    ...(sessions ?? []).map((item) => item.minutes_spent ?? 0),
  ].reduce((sum, minutes) => sum + minutes, 0);

  const weeklyMinutes = weeklyProgress.map((item) => ({ ...item }));
  const dayIndex = new Map(weeklyMinutes.map((item, index) => [item.day, index]));
  const events = [
    ...(attempts ?? []).map((item) => ({
      createdAt: item.completed_at ?? item.created_at,
      minutes: item.minutes_spent ?? 0,
    })),
    ...(sessions ?? []).map((item) => ({
      createdAt: item.created_at,
      minutes: item.minutes_spent ?? 0,
    })),
  ];

  for (const event of events) {
    if (!event.createdAt) continue;
    const day = new Intl.DateTimeFormat("en", { weekday: "short" }).format(new Date(event.createdAt));
    const index = dayIndex.get(day);
    if (index !== undefined) {
      weeklyMinutes[index].minutes += event.minutes;
    }
  }

  const speakingScoreRows = (scoredSpeakingAttempts ?? []) as ScoreRow[];
  const missionScoreRows = (missionAttempts ?? []) as ScoreRow[];
  const rubricRows = speakingScoreRows.length ? speakingScoreRows : missionScoreRows;
  const rubricSkills = buildRubricSkills(rubricRows);
  const rubricAverages = rubricSkills
    .map((skill) => skill.average)
    .filter((score): score is number => score !== null);

  return {
    completedLessons,
    completedMissions,
    speakingAttempts,
    dueReviewItems,
    vocabularyItems,
    corrections,
    conversations,
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null,
    rubricAverage: average(rubricAverages),
    strongestSkill: pickSkill(rubricSkills, "strongest"),
    weakestSkill: pickSkill(rubricSkills, "weakest"),
    rubricSkills,
    rubricTrend: buildRubricTrend(rubricRows),
    voiceConsistency: buildVoiceConsistency(voiceDeliveryRows),
    totalMinutes,
    weeklyMinutes,
    source: "supabase",
    reason: queryError?.message,
  };
}
