import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { vocabularyBatchSchema } from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import { logAiRequest, saveVocabularyBatch } from "@/lib/supabase/persistence";

const requestSchema = z.object({
  jobRole: z.string().min(2).max(80),
  topic: z.string().min(2).max(80),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    const result = await callJsonAgent({
      system: agentPrompts.vocabulary,
      user: JSON.stringify(input),
      schema: vocabularyBatchSchema,
    });
    const persistence = await saveVocabularyBatch({
      batch: result.data,
      jobRole: input.jobRole,
    });
    await logAiRequest({ agentType: "vocabulary", status: "success", meta: result.meta });

    return okJson({ ...result, persistence });
  } catch (error) {
    await logAiRequest({ agentType: "vocabulary", status: "failed", error });
    return errorJson(error);
  }
}
