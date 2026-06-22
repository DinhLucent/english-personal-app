import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { savePracticeSession } from "@/lib/supabase/persistence";

const requestSchema = z.object({
  type: z.enum(["conversation", "reflex", "grammar", "assessment"]),
  difficulty: z.string().max(40).optional(),
  summary: z.unknown().optional(),
  score: z.number().min(0).max(100).optional(),
  minutesSpent: z.number().min(0).max(180).optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(fail("invalid_request", "The request payload is invalid."), {
      status: 400,
    });
  }

  const persistence = await savePracticeSession({
    type: parsed.data.type,
    difficulty: parsed.data.difficulty,
    summary: parsed.data.summary,
    score: parsed.data.score,
    minutesSpent: parsed.data.minutesSpent,
  });

  if (!persistence.saved) {
    return NextResponse.json(
      fail("persistence_unavailable", persistence.reason ?? "Could not save practice session."),
      { status: 409 },
    );
  }

  return NextResponse.json(ok({ persistence }));
}
