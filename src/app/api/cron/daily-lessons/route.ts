import { NextResponse, type NextRequest } from "next/server";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { dailyLessonSchema } from "@/lib/ai/schemas";
import { fail, ok } from "@/lib/api";
import { daysBetweenDateKeys, getDateKey } from "@/lib/date";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type Profile = {
  id: string;
  email: string | null;
  target_level: string | null;
  job_role: string | null;
};

type LearningPlan = {
  id: string;
  duration_days: number;
  start_date: string;
  target_level: string | null;
  focus_areas: string[] | null;
};

function assertCronSecret(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

function getCronSettings() {
  return {
    timeZone: process.env.DAILY_LESSON_TIME_ZONE || "Asia/Saigon",
    maxUsers: Number(process.env.DAILY_LESSON_MAX_USERS || "25"),
  };
}

async function getOrCreatePlan({
  supabase,
  profile,
  today,
}: {
  supabase: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
  profile: Profile;
  today: string;
}): Promise<LearningPlan> {
  const { data: existingPlan, error: existingPlanError } = await supabase
    .from("learning_plans")
    .select("id, duration_days, start_date, target_level, focus_areas")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingPlanError) {
    throw new Error(existingPlanError.message);
  }

  if (existingPlan) {
    return existingPlan as LearningPlan;
  }

  const { data: newPlan, error: newPlanError } = await supabase
    .from("learning_plans")
    .insert({
      user_id: profile.id,
      duration_days: 30,
      start_date: today,
      target_level: profile.target_level,
      focus_areas: [],
    })
    .select("id, duration_days, start_date, target_level, focus_areas")
    .single();

  if (newPlanError) {
    throw new Error(newPlanError.message);
  }

  return newPlan as LearningPlan;
}

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json(fail("unauthorized", "Unauthorized cron request."), {
      status: 401,
    });
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      fail("missing_supabase_admin", "SUPABASE_SECRET_KEY is required for daily cron."),
      { status: 503 },
    );
  }

  const { timeZone, maxUsers } = getCronSettings();
  const today = getDateKey(new Date(), timeZone);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, email, target_level, job_role")
    .order("created_at", { ascending: true })
    .limit(maxUsers);

  if (profilesError) {
    return NextResponse.json(fail("supabase_error", profilesError.message), {
      status: 500,
    });
  }

  const summary = {
    date: today,
    timeZone,
    checked: profiles?.length ?? 0,
    generated: 0,
    skipped: 0,
    failed: 0,
    errors: [] as Array<{ userId: string; message: string }>,
  };

  for (const profile of (profiles ?? []) as Profile[]) {
    try {
      const plan = await getOrCreatePlan({ supabase, profile, today });
      const dayNumber = daysBetweenDateKeys(plan.start_date, today) + 1;

      if (dayNumber < 1 || dayNumber > plan.duration_days) {
        summary.skipped += 1;
        continue;
      }

      const { data: existingLesson, error: existingLessonError } = await supabase
        .from("daily_lessons")
        .select("id")
        .eq("user_id", profile.id)
        .eq("plan_id", plan.id)
        .eq("day_number", dayNumber)
        .maybeSingle();

      if (existingLessonError) {
        throw new Error(existingLessonError.message);
      }

      if (existingLesson) {
        summary.skipped += 1;
        continue;
      }

      const result = await callJsonAgent({
        system: agentPrompts.dailyLesson,
        user: JSON.stringify({
          dayNumber,
          level: plan.target_level || profile.target_level || "A2",
          jobRole: profile.job_role || "professional",
          focus: plan.focus_areas?.join(", ") || "daily work communication",
        }),
        schema: dailyLessonSchema,
      });

      const { error: insertError } = await supabase.from("daily_lessons").insert({
        user_id: profile.id,
        plan_id: plan.id,
        day_number: dayNumber,
        title: result.data.title,
        level: result.data.level,
        content_json: result.data,
        generated_by: result.meta.model,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      await supabase.from("ai_requests").insert({
        user_id: profile.id,
        agent_type: "daily_lesson_cron",
        model: result.meta.model,
        status: "success",
        latency_ms: result.meta.latencyMs,
        tokens_input: result.meta.tokensInput,
        tokens_output: result.meta.tokensOutput,
      });

      summary.generated += 1;
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({
        userId: profile.id,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json(ok(summary));
}
