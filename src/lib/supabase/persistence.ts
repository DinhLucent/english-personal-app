import {
  dailyLessonSchema,
  type AssessmentResult,
  type CorrectionResult,
  type DailyLesson,
  type VocabularyBatch,
} from "@/lib/ai/schemas";
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

async function getAuthenticatedContext() {
  const { supabase, user } = await getCurrentUser();

  if (!supabase) {
    return { supabase: null, user: null, reason: "Supabase is not configured." };
  }

  if (!user) {
    return { supabase, user: null, reason: "No authenticated Supabase user." };
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
