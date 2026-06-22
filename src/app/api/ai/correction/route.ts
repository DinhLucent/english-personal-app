import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { correctionSchema } from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import { logAiRequest, saveCorrection } from "@/lib/supabase/persistence";

const requestSchema = z.object({
  text: z.string().min(2).max(3000),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    const result = await callJsonAgent({
      system: agentPrompts.correction,
      user: `Correct this English text for a Vietnamese learner:\n\n${input.text}`,
      schema: correctionSchema,
    });
    const persistence = await saveCorrection({
      inputText: input.text,
      correction: result.data,
    });
    await logAiRequest({ agentType: "correction", status: "success", meta: result.meta });

    return okJson({ ...result, persistence });
  } catch (error) {
    await logAiRequest({ agentType: "correction", status: "failed", error });
    return errorJson(error);
  }
}
