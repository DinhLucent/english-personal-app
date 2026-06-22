import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { reflexFeedbackSchema, reflexSessionSchema } from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import { logAiRequest } from "@/lib/supabase/persistence";

const requestSchema = z.object({
  mode: z.enum(["questions", "feedback"]).default("questions"),
  topic: z.string().min(2).max(80).default("work and daily life"),
  question: z.string().max(300).optional(),
  answer: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    if (input.mode === "feedback") {
      const result = await callJsonAgent({
        system: agentPrompts.reflexFeedback,
        user: JSON.stringify(input),
        schema: reflexFeedbackSchema,
      });
      await logAiRequest({ agentType: "reflex_feedback", status: "success", meta: result.meta });

      return okJson(result);
    }

    const result = await callJsonAgent({
      system: agentPrompts.reflex,
      user: JSON.stringify(input),
      schema: reflexSessionSchema,
    });
    await logAiRequest({ agentType: "reflex", status: "success", meta: result.meta });

    return okJson(result);
  } catch (error) {
    await logAiRequest({ agentType: "reflex", status: "failed", error });
    return errorJson(error);
  }
}
