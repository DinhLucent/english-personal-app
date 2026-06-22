import { getCurrentUser } from "@/lib/supabase/server";
import { weeklyProgress } from "@/lib/demo-data";

export type ProgressSummary = {
  completedLessons: number;
  vocabularyItems: number;
  corrections: number;
  conversations: number;
  averageScore: number | null;
  totalMinutes: number;
  weeklyMinutes: Array<{ day: string; minutes: number }>;
  source: "supabase" | "empty";
};

export async function getProgressSummary(): Promise<ProgressSummary> {
  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return {
      completedLessons: 0,
      vocabularyItems: 0,
      corrections: 0,
      conversations: 0,
      averageScore: null,
      totalMinutes: 0,
      weeklyMinutes: weeklyProgress,
      source: "empty",
    };
  }

  const [
    completedLessonsResult,
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
  const vocabularyItems = vocabularyItemsResult.count ?? 0;
  const corrections = correctionsResult.count ?? 0;
  const conversations = conversationsResult.count ?? 0;

  const { data: attempts } = await supabase
    .from("lesson_attempts")
    .select("score, minutes_spent, completed_at, created_at")
    .eq("user_id", user.id);

  const { data: sessions } = await supabase
    .from("practice_sessions")
    .select("score, minutes_spent, created_at")
    .eq("user_id", user.id);

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

  return {
    completedLessons,
    vocabularyItems,
    corrections,
    conversations,
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null,
    totalMinutes,
    weeklyMinutes,
    source: "supabase",
  };
}
