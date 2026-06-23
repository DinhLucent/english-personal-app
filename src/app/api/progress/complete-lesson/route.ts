import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { getCurrentUser } from "@/lib/supabase/server";

const requestSchema = z.object({
  lessonId: z.string().uuid(),
  score: z.number().min(0).max(100).default(80),
  minutesSpent: z.number().min(1).max(180).default(25),
  writingAnswer: z.string().max(3000).optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(fail("invalid_request", "The request payload is invalid."), {
      status: 400,
    });
  }

  const { supabase, user } = await getCurrentUser();
  if (!supabase || !user) {
    return NextResponse.json(
      fail("personal_profile_unavailable", "Supabase personal profile is unavailable."),
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("lesson_attempts")
    .insert({
      user_id: user.id,
      lesson_id: parsed.data.lessonId,
      status: "completed",
      score: parsed.data.score,
      minutes_spent: parsed.data.minutesSpent,
      writing_answer: parsed.data.writingAnswer ?? null,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json(fail("supabase_error", error.message), { status: 500 });
  }

  return NextResponse.json(ok({ attemptId: data.id }));
}
