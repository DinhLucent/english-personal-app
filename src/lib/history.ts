import { getCurrentUser } from "@/lib/supabase/server";

export type HistoryEnvelope<T> = {
  items: T[];
  source: "supabase" | "empty";
  reason?: string;
};

export type CorrectionHistoryItem = {
  id: string;
  originalText: string;
  correctedText: string;
  naturalText: string;
  score: number | null;
  createdAt: string;
};

export type VocabularyHistoryItem = {
  id: string;
  word: string;
  meaningVi: string;
  example: string;
  topic: string | null;
  reviewCount: number;
  nextReviewAt: string | null;
  createdAt: string;
};

export type SessionHistoryItem = {
  id: string;
  type: string;
  difficulty: string | null;
  status: string;
  score: number | null;
  minutesSpent: number;
  summary: unknown;
  createdAt: string;
};

export type AssessmentHistoryItem = {
  id: string;
  level: string;
  score: unknown;
  strengths: string[];
  weaknesses: string[];
  nextPlan: unknown;
  createdAt: string;
};

async function getHistoryContext() {
  const { supabase, user } = await getCurrentUser();

  if (!supabase) {
    return { supabase: null, user: null, reason: "Supabase is not configured." };
  }

  if (!user) {
    return { supabase, user: null, reason: "No authenticated Supabase user." };
  }

  return { supabase, user, reason: null };
}

export async function getCorrectionHistory(
  limit = 10,
): Promise<HistoryEnvelope<CorrectionHistoryItem>> {
  const { supabase, user, reason } = await getHistoryContext();
  if (!supabase || !user) {
    return { items: [], source: "empty", reason: reason ?? "History unavailable." };
  }

  const { data, error } = await supabase
    .from("corrections")
    .select("id, original_text, corrected_text, natural_text, score, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], source: "empty", reason: error.message };
  }

  return {
    source: "supabase",
    items: (data ?? []).map((item) => ({
      id: item.id,
      originalText: item.original_text,
      correctedText: item.corrected_text,
      naturalText: item.natural_text,
      score: item.score,
      createdAt: item.created_at,
    })),
  };
}

export async function getVocabularyHistory(
  limit = 20,
): Promise<HistoryEnvelope<VocabularyHistoryItem>> {
  const { supabase, user, reason } = await getHistoryContext();
  if (!supabase || !user) {
    return { items: [], source: "empty", reason: reason ?? "History unavailable." };
  }

  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("id, word, meaning_vi, example, topic, review_count, next_review_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], source: "empty", reason: error.message };
  }

  return {
    source: "supabase",
    items: (data ?? []).map((item) => ({
      id: item.id,
      word: item.word,
      meaningVi: item.meaning_vi,
      example: item.example,
      topic: item.topic,
      reviewCount: item.review_count,
      nextReviewAt: item.next_review_at,
      createdAt: item.created_at,
    })),
  };
}

export async function getSessionHistory(
  limit = 10,
): Promise<HistoryEnvelope<SessionHistoryItem>> {
  const { supabase, user, reason } = await getHistoryContext();
  if (!supabase || !user) {
    return { items: [], source: "empty", reason: reason ?? "History unavailable." };
  }

  const { data, error } = await supabase
    .from("practice_sessions")
    .select("id, type, difficulty, status, score, minutes_spent, summary_json, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], source: "empty", reason: error.message };
  }

  return {
    source: "supabase",
    items: (data ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      difficulty: item.difficulty,
      status: item.status,
      score: item.score,
      minutesSpent: item.minutes_spent,
      summary: item.summary_json,
      createdAt: item.created_at,
    })),
  };
}

export async function getAssessmentHistory(
  limit = 10,
): Promise<HistoryEnvelope<AssessmentHistoryItem>> {
  const { supabase, user, reason } = await getHistoryContext();
  if (!supabase || !user) {
    return { items: [], source: "empty", reason: reason ?? "History unavailable." };
  }

  const { data, error } = await supabase
    .from("assessments")
    .select("id, level, score_json, strengths, weaknesses, next_plan_json, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { items: [], source: "empty", reason: error.message };
  }

  return {
    source: "supabase",
    items: (data ?? []).map((item) => ({
      id: item.id,
      level: item.level,
      score: item.score_json,
      strengths: item.strengths ?? [],
      weaknesses: item.weaknesses ?? [],
      nextPlan: item.next_plan_json,
      createdAt: item.created_at,
    })),
  };
}
