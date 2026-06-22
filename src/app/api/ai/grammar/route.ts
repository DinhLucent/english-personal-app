import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import { grammarLessonSchema } from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import { logAiRequest, savePracticeSession } from "@/lib/supabase/persistence";

const requestSchema = z.object({
  topic: z.string().min(2).max(80),
  level: z.string().min(1).max(20).default("A2"),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    const result = await callJsonAgent({
      system: agentPrompts.grammar,
      user: JSON.stringify(input),
      schema: grammarLessonSchema,
    });
    const persistence = await savePracticeSession({
      type: "grammar",
      summary: result.data,
    });
    await logAiRequest({ agentType: "grammar", status: "success", meta: result.meta });

    return okJson({ ...result, persistence });
  } catch (error) {
    await logAiRequest({ agentType: "grammar", status: "failed", error });
    return errorJson(error);
  }
}
