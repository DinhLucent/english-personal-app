import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { dailyLessonSchema } from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import {
  findExistingDailyLesson,
  logAiRequest,
  saveDailyLesson,
} from "@/lib/supabase/persistence";

const requestSchema = z.object({
  dayNumber: z.number().min(1).max(30).default(1),
  level: z.string().min(1).default("A2"),
  jobRole: z.string().min(1).max(80).default("software developer"),
  focus: z.string().max(180).optional(),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    const existingLesson = await findExistingDailyLesson({
      dayNumber: input.dayNumber,
    });

    if (existingLesson) {
      return okJson({
        data: existingLesson.lesson,
        meta: {
          model: "supabase-cache",
          latencyMs: 0,
          tokensInput: null,
          tokensOutput: null,
        },
        persistence: existingLesson.persistence,
      });
    }

    const result = await callJsonAgent({
      system: agentPrompts.dailyLesson,
      user: JSON.stringify(input),
      schema: dailyLessonSchema,
    });
    const persistence = await saveDailyLesson({
      dayNumber: input.dayNumber,
      lesson: result.data,
    });
    await logAiRequest({ agentType: "daily_lesson", status: "success", meta: result.meta });

    return okJson({ ...result, persistence });
  } catch (error) {
    await logAiRequest({ agentType: "daily_lesson", status: "failed", error });
    return errorJson(error);
  }
}
