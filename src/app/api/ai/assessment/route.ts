import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { assessmentSchema } from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import { logAiRequest, saveAssessment } from "@/lib/supabase/persistence";

const requestSchema = z.object({
  vocabularyAnswers: z.string().min(2).max(2000),
  grammarAnswers: z.string().min(2).max(2000),
  communicationAnswers: z.string().min(2).max(2000),
  writingSample: z.string().min(2).max(2000),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    const result = await callJsonAgent({
      system: agentPrompts.assessment,
      user: JSON.stringify(input),
      schema: assessmentSchema,
    });
    const persistence = await saveAssessment({ assessment: result.data });
    await logAiRequest({ agentType: "assessment", status: "success", meta: result.meta });

    return okJson({ ...result, persistence });
  } catch (error) {
    await logAiRequest({ agentType: "assessment", status: "failed", error });
    return errorJson(error);
  }
}
