import {
  dailyLessonSchema,
  type AssessmentResult,
  type CorrectionResult,
  type DailyLesson,
  type SpeakingFeedback,
  type SpeakingInputMode,
  type SpeakingRetryFeedback,
  type SpeakingReviewCandidate,
  type SpeakingScores,
  type SpeakingVoiceMetrics,
  type VocabularyBatch,
} from "@/lib/ai/schemas";
import type { MissionStep, SpeakingMission } from "@/lib/missions";
import { getCurrentUser } from "@/lib/supabase/server";

type AiMeta = {
  model: string;
  latencyMs: number;
  tokensInput: number | null;
  tokensOutput: number | null;
};

type PersistenceResult = {
  saved: boolean;
  table?: string;
  id?: string;
  reason?: string;
};

export type SpeakingPersistenceResult = PersistenceResult & {
  missionId?: string;
  missionAttemptId?: string;
  speakingAttemptId?: string;
  retryOf?: string | null;
  status?: "started" | "completed";
  currentStep?: MissionStep;
  reviewItemsCreated?: number;
  reviewItemsReason?: string;
};

export type ReviewItem = {
  id: string;
  sourceType: "error" | "chunk" | "vocabulary" | "answer";
  sourceId: string | null;
  missionId: string | null;
  sourceInputMode?: SpeakingInputMode | null;
  sourceStep?: "drill" | "roleplay" | "retry" | null;
  sourceLabel?: string | null;
  content: string;
  meaningVi: string | null;
  example: string | null;
  errorPattern: string | null;
  correctForm: string | null;
  nextReviewAt: string;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ReviewItemsEnvelope = {
  items: ReviewItem[];
  source: "supabase" | "empty";
  reason?: string;
};

export type ReviewRating = "again" | "good" | "easy";

export type ReviewUpdateResult = PersistenceResult & {
  item?: ReviewItem;
};

type MissionAttemptStatus = "started" | "completed";

type SpeakingAttemptStep = "drill" | "roleplay" | "retry";

export type SpeakingDeliveryPayload = {
  inputMode: SpeakingInputMode;
  voiceMetrics?: SpeakingVoiceMetrics | null;
  deliverySignals?: SpeakingFeedback["deliverySignals"] | SpeakingRetryFeedback["deliverySignals"] | null;
};

type ReviewItemInsertContext = {
  supabase: NonNullable<
    Awaited<ReturnType<typeof getMissionPersistenceContext>>["supabase"]
  >;
  userId: string;
  missionId: string;
  sourceId: string;
  candidates: SpeakingReviewCandidate[];
};

async function getAuthenticatedContext() {
  const { supabase, user } = await getCurrentUser();

  if (!supabase) {
    return { supabase: null, user: null, reason: "Supabase is not configured." };
  }

  if (!user) {
    return { supabase, user: null, reason: "Personal Supabase profile is unavailable." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email ?? null,
    display_name:
      typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user.email?.split("@")[0] ?? null,
  });

  if (profileError) {
    return { supabase, user: null, reason: profileError.message };
  }

  return { supabase, user, reason: null };
}

async function getOrCreateLearningPlan({
  targetLevel,
}: {
  targetLevel?: string | null;
}) {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { supabase, user, planId: null, error: reason ?? "Persistence unavailable." };
  }

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from("learning_plans")
    .select("id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingPlanError) {
    return { supabase, user, planId: null, error: existingPlanError.message };
  }

  if (existingPlan?.id) {
    return { supabase, user, planId: existingPlan.id, error: null };
  }

  const { data: newPlan, error: newPlanError } = await supabase
    .from("learning_plans")
    .insert({
      user_id: user.id,
      duration_days: 30,
      target_level: targetLevel ?? null,
    })
    .select("id")
    .single();

  if (newPlanError) {
    return { supabase, user, planId: null, error: newPlanError.message };
  }

  return { supabase, user, planId: newPlan.id, error: null };
}

export async function findExistingDailyLesson({
  dayNumber,
}: {
  dayNumber: number;
}): Promise<{
  lesson: DailyLesson;
  persistence: PersistenceResult;
} | null> {
  const { supabase, user, planId } = await getOrCreateLearningPlan({ targetLevel: null });
  if (!supabase || !user || !planId) {
    return null;
  }

  const { data, error } = await supabase
    .from("daily_lessons")
    .select("id, content_json")
    .eq("user_id", user.id)
    .eq("plan_id", planId)
    .eq("day_number", dayNumber)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsedLesson = dailyLessonSchema.safeParse(data.content_json);
  if (!parsedLesson.success) {
    return null;
  }

  return {
    lesson: parsedLesson.data,
    persistence: {
      saved: true,
      table: "daily_lessons",
      id: data.id,
      reason: "Loaded existing lesson from Supabase.",
    },
  };
}

export async function logAiRequest({
  agentType,
  status,
  meta,
  error,
}: {
  agentType: string;
  status: "success" | "failed";
  meta?: AiMeta;
  error?: unknown;
}) {
  const { supabase, user } = await getCurrentUser();
  if (!supabase) {
    return;
  }

  await supabase.from("ai_requests").insert({
    user_id: user?.id ?? null,
    agent_type: agentType,
    model: meta?.model ?? process.env.DEEPSEEK_MODEL ?? null,
    status,
    latency_ms: meta?.latencyMs ?? null,
    tokens_input: meta?.tokensInput ?? null,
    tokens_output: meta?.tokensOutput ?? null,
    error_message: error instanceof Error ? error.message : null,
  });
}

function toScoreColumns(scores?: SpeakingScores | null) {
  if (!scores) {
    return {};
  }

  const score = (value: number) => Math.max(0, Math.min(5, Math.round(value)));

  return {
    score_task: score(scores.taskCompletion),
    score_fluency: score(scores.fluency),
    score_accuracy: score(scores.accuracy),
    score_vocabulary: score(scores.vocabulary),
    score_interaction: score(scores.interaction),
  };
}

async function getMissionPersistenceContext(mission: SpeakingMission) {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return {
      supabase,
      user,
      missionId: null,
      reason: reason ?? "Persistence unavailable.",
    };
  }

  const { data, error } = await supabase
    .from("missions")
    .select("id")
    .eq("slug", mission.id)
    .maybeSingle();

  if (error) {
    return { supabase, user, missionId: null, reason: error.message };
  }

  if (!data?.id) {
    return {
      supabase,
      user,
      missionId: null,
      reason: "Mission is not seeded in Supabase yet.",
    };
  }

  return { supabase, user, missionId: data.id as string, reason: null };
}

async function saveReviewItemsFromCandidates({
  supabase,
  userId,
  missionId,
  sourceId,
  candidates,
}: ReviewItemInsertContext) {
  const rows = candidates
    .map((candidate) => ({
      user_id: userId,
      source_type: candidate.type,
      source_id: sourceId,
      mission_id: missionId,
      content: candidate.content.trim(),
      meaning_vi: candidate.meaningVi ?? null,
      example: candidate.example ?? null,
      error_pattern: candidate.errorPattern ?? null,
      correct_form: candidate.correctForm ?? null,
      next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }))
    .filter((row) => row.content.length > 0);

  if (!rows.length) {
    return { count: 0, reason: undefined };
  }

  const { data, error } = await supabase
    .from("review_items")
    .insert(rows)
    .select("id");

  if (error) {
    return { count: 0, reason: error.message };
  }

  return { count: data?.length ?? rows.length, reason: undefined };
}

type ReviewItemRow = {
  id: string;
  source_type: ReviewItem["sourceType"];
  source_id: string | null;
  mission_id: string | null;
  content: string;
  meaning_vi: string | null;
  example: string | null;
  error_pattern: string | null;
  correct_form: string | null;
  next_review_at: string;
  review_count: number;
  created_at: string;
  updated_at: string;
};

type ReviewSourceMeta = {
  inputMode: SpeakingInputMode | null;
  step: SpeakingAttemptStep | null;
};

function getReviewSourceLabel(source?: ReviewSourceMeta) {
  if (!source?.inputMode) return null;

  const stepLabel = source.step === "retry" ? "retry" : "feedback";

  return source.inputMode === "voice"
    ? `Voice ${stepLabel}`
    : `Typed ${stepLabel}`;
}

function mapReviewItem(
  row: ReviewItemRow,
  sourceMeta?: ReviewSourceMeta,
): ReviewItem {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceId: row.source_id,
    missionId: row.mission_id,
    sourceInputMode: sourceMeta?.inputMode ?? null,
    sourceStep: sourceMeta?.step ?? null,
    sourceLabel: getReviewSourceLabel(sourceMeta),
    content: row.content,
    meaningVi: row.meaning_vi,
    example: row.example,
    errorPattern: row.error_pattern,
    correctForm: row.correct_form,
    nextReviewAt: row.next_review_at,
    reviewCount: row.review_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseSpeakingDelivery(value: unknown): SpeakingDeliveryPayload | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const inputMode = record.inputMode === "voice" ? "voice" : record.inputMode === "typed" ? "typed" : null;

  if (!inputMode) return null;

  return {
    inputMode,
    voiceMetrics:
      record.voiceMetrics && typeof record.voiceMetrics === "object" && !Array.isArray(record.voiceMetrics)
        ? (record.voiceMetrics as SpeakingVoiceMetrics)
        : null,
    deliverySignals:
      record.deliverySignals && typeof record.deliverySignals === "object" && !Array.isArray(record.deliverySignals)
        ? (record.deliverySignals as SpeakingDeliveryPayload["deliverySignals"])
        : null,
  };
}

async function getReviewSourceMeta({
  supabase,
  sourceIds,
}: {
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedContext>>["supabase"]>;
  sourceIds: string[];
}) {
  if (!sourceIds.length) return new Map<string, ReviewSourceMeta>();

  const query = await supabase
    .from("speaking_attempts")
    .select("id, step, delivery_json")
    .in("id", sourceIds);
  let rows = (query.data ?? []) as Array<{
    id: string;
    step?: string | null;
    delivery_json?: unknown;
  }>;

  if (query.error && /delivery_json/i.test(query.error.message)) {
    const fallbackQuery = await supabase
      .from("speaking_attempts")
      .select("id, step")
      .in("id", sourceIds);

    if (fallbackQuery.error) return new Map<string, ReviewSourceMeta>();

    rows = (fallbackQuery.data ?? []) as Array<{
      id: string;
      step?: string | null;
      delivery_json?: unknown;
    }>;
  }

  const meta = new Map<string, ReviewSourceMeta>();

  if (query.error && !/delivery_json/i.test(query.error.message)) return meta;

  for (const row of rows) {
    const delivery = parseSpeakingDelivery((row as { delivery_json?: unknown }).delivery_json);
    const step = (row as { step?: string | null }).step;

    meta.set((row as { id: string }).id, {
      inputMode: delivery?.inputMode ?? null,
      step: step === "drill" || step === "roleplay" || step === "retry" ? step : null,
    });
  }

  return meta;
}

function getNextReviewAt(rating: ReviewRating, nextReviewCount: number) {
  if (rating === "again") {
    return new Date(Date.now() + 20 * 60 * 1000).toISOString();
  }

  const intervalDays =
    rating === "easy"
      ? Math.max(3, nextReviewCount * 3)
      : Math.max(1, nextReviewCount);

  return new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString();
}

export async function getDueReviewItems(limit = 20): Promise<ReviewItemsEnvelope> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return {
      items: [],
      source: "empty",
      reason: reason ?? "Persistence unavailable.",
    };
  }

  const { data, error } = await supabase
    .from("review_items")
    .select(
      "id, source_type, source_id, mission_id, content, meaning_vi, example, error_pattern, correct_form, next_review_at, review_count, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .lte("next_review_at", new Date().toISOString())
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (error) {
    return {
      items: [],
      source: "empty",
      reason: error.message,
    };
  }

  const rows = (data ?? []) as ReviewItemRow[];
  const sourceIds = rows
    .map((row) => row.source_id)
    .filter((id): id is string => Boolean(id));
  const sourceMeta = await getReviewSourceMeta({ supabase, sourceIds });

  return {
    items: rows.map((row) => mapReviewItem(row, row.source_id ? sourceMeta.get(row.source_id) : undefined)),
    source: "supabase",
  };
}

export async function markReviewItemReviewed({
  itemId,
  rating,
}: {
  itemId: string;
  rating: ReviewRating;
}): Promise<ReviewUpdateResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const { data: existingItem, error: existingError } = await supabase
    .from("review_items")
    .select("review_count")
    .eq("id", itemId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError) {
    return { saved: false, reason: existingError.message };
  }

  if (!existingItem) {
    return { saved: false, reason: "Review item was not found." };
  }

  const nextReviewCount = (existingItem.review_count as number) + 1;
  const { data, error } = await supabase
    .from("review_items")
    .update({
      review_count: nextReviewCount,
      next_review_at: getNextReviewAt(rating, nextReviewCount),
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", user.id)
    .select(
      "id, source_type, source_id, mission_id, content, meaning_vi, example, error_pattern, correct_form, next_review_at, review_count, created_at, updated_at",
    )
    .single();

  if (error) {
    return { saved: false, reason: error.message };
  }

  return {
    saved: true,
    table: "review_items",
    id: data.id,
    item: mapReviewItem(data as ReviewItemRow),
  };
}

function buildDeliveryPayload({
  inputMode,
  voiceMetrics,
  deliverySignals,
}: SpeakingDeliveryPayload): SpeakingDeliveryPayload {
  return {
    inputMode,
    voiceMetrics: voiceMetrics ?? null,
    deliverySignals: deliverySignals ?? null,
  };
}

async function insertSpeakingAttemptWithDelivery({
  supabase,
  payload,
}: {
  supabase: NonNullable<Awaited<ReturnType<typeof getMissionPersistenceContext>>["supabase"]>;
  payload: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("speaking_attempts")
    .insert(payload)
    .select("id")
    .single();

  if (!error) {
    return { data, error };
  }

  if (!("delivery_json" in payload) || !/delivery_json/i.test(error.message)) {
    return { data, error };
  }

  const { delivery_json, ...fallbackPayload } = payload;
  void delivery_json;

  return supabase
    .from("speaking_attempts")
    .insert(fallbackPayload)
    .select("id")
    .single();
}

async function upsertMissionAttempt({
  mission,
  currentStep,
  status,
  scores,
  summary,
}: {
  mission: SpeakingMission;
  currentStep: MissionStep;
  status: MissionAttemptStatus;
  scores?: SpeakingScores | null;
  summary?: unknown;
}): Promise<
  SpeakingPersistenceResult & {
    supabase?: Awaited<ReturnType<typeof getMissionPersistenceContext>>["supabase"];
    userId?: string;
  }
> {
  const context = await getMissionPersistenceContext(mission);
  if (!context.supabase || !context.user || !context.missionId) {
    return {
      saved: false,
      reason: context.reason ?? "Persistence unavailable.",
      currentStep,
      status,
    };
  }

  const now = new Date().toISOString();
  const { data: existingAttempt, error: existingAttemptError } = await context.supabase
    .from("mission_attempts")
    .select("id, status")
    .eq("user_id", context.user.id)
    .eq("mission_id", context.missionId)
    .maybeSingle();

  if (existingAttemptError) {
    return {
      saved: false,
      reason: existingAttemptError.message,
      missionId: context.missionId,
      currentStep,
      status,
    };
  }

  const nextStatus =
    existingAttempt?.status === "completed" && status === "started"
      ? "completed"
      : status;
  const payload: Record<string, unknown> = {
    status: nextStatus,
    current_step: currentStep,
    updated_at: now,
    ...toScoreColumns(scores),
  };

  if (summary !== undefined) {
    payload.summary_json = summary;
  }

  if (nextStatus === "completed") {
    payload.completed_at = now;
  }

  if (existingAttempt?.id) {
    const { data, error } = await context.supabase
      .from("mission_attempts")
      .update(payload)
      .eq("id", existingAttempt.id)
      .select("id")
      .single();

    if (error) {
      return {
        saved: false,
        reason: error.message,
        missionId: context.missionId,
        currentStep,
        status: nextStatus,
      };
    }

    return {
      saved: true,
      table: "mission_attempts",
      id: data.id,
      missionId: context.missionId,
      missionAttemptId: data.id,
      status: nextStatus,
      currentStep,
      supabase: context.supabase,
      userId: context.user.id,
    };
  }

  const { data, error } = await context.supabase
    .from("mission_attempts")
    .insert({
      user_id: context.user.id,
      mission_id: context.missionId,
      ...payload,
    })
    .select("id")
    .single();

  if (error) {
    return {
      saved: false,
      reason: error.message,
      missionId: context.missionId,
      currentStep,
      status: nextStatus,
    };
  }

  return {
    saved: true,
    table: "mission_attempts",
    id: data.id,
    missionId: context.missionId,
    missionAttemptId: data.id,
    status: nextStatus,
    currentStep,
    supabase: context.supabase,
    userId: context.user.id,
  };
}

export async function startSpeakingMissionAttempt({
  mission,
  currentStep = "roleplay",
}: {
  mission: SpeakingMission;
  currentStep?: MissionStep;
}): Promise<SpeakingPersistenceResult> {
  const attempt = await upsertMissionAttempt({
    mission,
    currentStep,
    status: "started",
  });

  return {
    saved: attempt.saved,
    table: attempt.table,
    id: attempt.id,
    reason: attempt.reason,
    missionId: attempt.missionId,
    missionAttemptId: attempt.missionAttemptId,
    status: attempt.status,
    currentStep: attempt.currentStep,
  };
}

export async function saveSpeakingFeedbackAttempt({
  mission,
  prompt,
  userAnswer,
  feedback,
  inputMode = "typed",
  voiceMetrics = null,
}: {
  mission: SpeakingMission;
  prompt: string;
  userAnswer: string;
  feedback: SpeakingFeedback;
  inputMode?: SpeakingInputMode;
  voiceMetrics?: SpeakingVoiceMetrics | null;
}): Promise<SpeakingPersistenceResult> {
  const attempt = await upsertMissionAttempt({
    mission,
    currentStep: "feedback",
    status: "started",
    scores: feedback.scores,
    summary: feedback,
  });

  if (!attempt.saved || !attempt.supabase || !attempt.userId || !attempt.missionId || !attempt.missionAttemptId) {
    return attempt;
  }

  const { data, error } = await insertSpeakingAttemptWithDelivery({
    supabase: attempt.supabase,
    payload: {
      user_id: attempt.userId,
      mission_id: attempt.missionId,
      mission_attempt_id: attempt.missionAttemptId,
      step: "roleplay" satisfies SpeakingAttemptStep,
      prompt,
      user_answer: userAnswer,
      feedback_json: feedback,
      delivery_json: buildDeliveryPayload({
        inputMode,
        voiceMetrics,
        deliverySignals: feedback.deliverySignals,
      }),
      ...toScoreColumns(feedback.scores),
    },
  });

  if (error) {
    return {
      saved: false,
      reason: error.message,
      table: "speaking_attempts",
      missionId: attempt.missionId,
      missionAttemptId: attempt.missionAttemptId,
      status: attempt.status,
      currentStep: attempt.currentStep,
    };
  }

  const reviewItems = await saveReviewItemsFromCandidates({
    supabase: attempt.supabase,
    userId: attempt.userId,
    missionId: attempt.missionId,
    sourceId: data.id,
    candidates: feedback.reviewCandidates,
  });

  return {
    saved: true,
    table: "speaking_attempts",
    id: data.id,
    missionId: attempt.missionId,
    missionAttemptId: attempt.missionAttemptId,
    speakingAttemptId: data.id,
    status: attempt.status,
    currentStep: attempt.currentStep,
    reviewItemsCreated: reviewItems.count,
    reviewItemsReason: reviewItems.reason,
  };
}

export async function saveSpeakingRetryAttempt({
  mission,
  prompt,
  retryAnswer,
  retryFeedback,
  retryOf,
  inputMode = "typed",
  voiceMetrics = null,
}: {
  mission: SpeakingMission;
  prompt: string;
  retryAnswer: string;
  retryFeedback: SpeakingRetryFeedback;
  retryOf?: string | null;
  inputMode?: SpeakingInputMode;
  voiceMetrics?: SpeakingVoiceMetrics | null;
}): Promise<SpeakingPersistenceResult> {
  const attempt = await upsertMissionAttempt({
    mission,
    currentStep: "review",
    status: "completed",
    scores: retryFeedback.scores,
    summary: retryFeedback,
  });

  if (!attempt.saved || !attempt.supabase || !attempt.userId || !attempt.missionId || !attempt.missionAttemptId) {
    return attempt;
  }

  const { data, error } = await insertSpeakingAttemptWithDelivery({
    supabase: attempt.supabase,
    payload: {
      user_id: attempt.userId,
      mission_id: attempt.missionId,
      mission_attempt_id: attempt.missionAttemptId,
      step: "retry" satisfies SpeakingAttemptStep,
      prompt,
      user_answer: retryAnswer,
      retry_of: retryOf ?? null,
      feedback_json: retryFeedback,
      delivery_json: buildDeliveryPayload({
        inputMode,
        voiceMetrics,
        deliverySignals: retryFeedback.deliverySignals,
      }),
      ...toScoreColumns(retryFeedback.scores),
    },
  });

  if (error) {
    return {
      saved: false,
      reason: error.message,
      table: "speaking_attempts",
      missionId: attempt.missionId,
      missionAttemptId: attempt.missionAttemptId,
      retryOf: retryOf ?? null,
      status: attempt.status,
      currentStep: attempt.currentStep,
    };
  }

  const reviewItems = await saveReviewItemsFromCandidates({
    supabase: attempt.supabase,
    userId: attempt.userId,
    missionId: attempt.missionId,
    sourceId: data.id,
    candidates: retryFeedback.reviewCandidates,
  });

  return {
    saved: true,
    table: "speaking_attempts",
    id: data.id,
    missionId: attempt.missionId,
    missionAttemptId: attempt.missionAttemptId,
    speakingAttemptId: data.id,
    retryOf: retryOf ?? null,
    status: attempt.status,
    currentStep: attempt.currentStep,
    reviewItemsCreated: reviewItems.count,
    reviewItemsReason: reviewItems.reason,
  };
}

export async function saveDailyLesson({
  dayNumber,
  lesson,
}: {
  dayNumber: number;
  lesson: DailyLesson;
}): Promise<PersistenceResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const plan = await getOrCreateLearningPlan({ targetLevel: lesson.level });
  if (!plan.planId) {
    return { saved: false, reason: plan.error ?? "Could not create learning plan." };
  }

  const { data, error } = await supabase
    .from("daily_lessons")
    .upsert(
      {
        user_id: user.id,
        plan_id: plan.planId,
        day_number: dayNumber,
        title: lesson.title,
        level: lesson.level,
        content_json: lesson,
      },
      { onConflict: "user_id,plan_id,day_number" },
    )
    .select("id")
    .single();

  if (error) {
    return { saved: false, reason: error.message };
  }

  return { saved: true, table: "daily_lessons", id: data.id };
}

export async function saveCorrection({
  inputText,
  correction,
}: {
  inputText: string;
  correction: CorrectionResult;
}): Promise<PersistenceResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const { data, error } = await supabase
    .from("corrections")
    .insert({
      user_id: user.id,
      original_text: inputText,
      corrected_text: correction.corrected,
      natural_text: correction.natural,
      mistakes_json: correction.mistakes,
      explanation_vi: correction.mistakes.map((item) => item.explanationVi).join("\n"),
      score: correction.score,
    })
    .select("id")
    .single();

  if (error) {
    return { saved: false, reason: error.message };
  }

  return { saved: true, table: "corrections", id: data.id };
}

export async function saveVocabularyBatch({
  batch,
  jobRole,
}: {
  batch: VocabularyBatch;
  jobRole: string;
}): Promise<PersistenceResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const { data, error } = await supabase
    .from("vocabulary_items")
    .insert(
      batch.items.map((item) => ({
        user_id: user.id,
        word: item.word,
        meaning_vi: item.meaningVi,
        example: item.example,
        topic: item.topic || batch.topic,
        job_context: jobRole,
        next_review_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })),
    )
    .select("id");

  if (error) {
    return { saved: false, reason: error.message };
  }

  return { saved: true, table: "vocabulary_items", id: data?.[0]?.id };
}

export async function saveAssessment({
  assessment,
}: {
  assessment: AssessmentResult;
}): Promise<PersistenceResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      user_id: user.id,
      level: assessment.level,
      score_json: assessment.scores,
      strengths: assessment.strengths,
      weaknesses: assessment.weaknesses,
      next_plan_json: assessment.nextSevenDays,
    })
    .select("id")
    .single();

  if (error) {
    return { saved: false, reason: error.message };
  }

  return { saved: true, table: "assessments", id: data.id };
}

export async function savePracticeSession({
  type,
  difficulty,
  summary,
  score,
  minutesSpent,
}: {
  type: "conversation" | "reflex" | "grammar" | "assessment";
  difficulty?: string;
  summary?: unknown;
  score?: number;
  minutesSpent?: number;
}): Promise<PersistenceResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: user.id,
      type,
      difficulty: difficulty ?? null,
      status: "completed",
      summary_json: summary ?? null,
      score: score ?? null,
      minutes_spent: minutesSpent ?? 0,
    })
    .select("id")
    .single();

  if (error) {
    return { saved: false, reason: error.message };
  }

  return { saved: true, table: "practice_sessions", id: data.id };
}

export async function saveConversationTranscript({
  difficulty,
  messages,
  summary,
  score,
}: {
  difficulty: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  summary: unknown;
  score?: number;
}): Promise<PersistenceResult> {
  const { supabase, user, reason } = await getAuthenticatedContext();
  if (!supabase || !user) {
    return { saved: false, reason: reason ?? "Persistence unavailable." };
  }

  const { data: session, error: sessionError } = await supabase
    .from("practice_sessions")
    .insert({
      user_id: user.id,
      type: "conversation",
      difficulty,
      status: "completed",
      summary_json: summary,
      score: score ?? null,
    })
    .select("id")
    .single();

  if (sessionError) {
    return { saved: false, reason: sessionError.message };
  }

  if (messages.length) {
    const { error: messageError } = await supabase.from("conversation_messages").insert(
      messages.map((message) => ({
        session_id: session.id,
        user_id: user.id,
        role: message.role,
        content: message.content,
      })),
    );

    if (messageError) {
      return { saved: false, reason: messageError.message };
    }
  }

  return { saved: true, table: "practice_sessions", id: session.id };
}
