import { z } from "zod";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import {
  conversationReplySchema,
  conversationSummarySchema,
} from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import {
  logAiRequest,
  saveConversationTranscript,
} from "@/lib/supabase/persistence";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(1000),
});

const requestSchema = z.object({
  mode: z.enum(["reply", "summary"]).default("reply"),
  difficulty: z.enum(["Easy", "Normal", "Hard"]).default("Normal"),
  messages: z.array(messageSchema).max(20),
});

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    if (input.mode === "summary") {
      const result = await callJsonAgent({
        system: agentPrompts.conversationSummary,
        user: JSON.stringify(input),
        schema: conversationSummarySchema,
      });
      const persistence = await saveConversationTranscript({
        difficulty: input.difficulty,
        messages: input.messages,
        summary: result.data,
        score: result.data.score,
      });
      await logAiRequest({ agentType: "conversation_summary", status: "success", meta: result.meta });

      return okJson({ ...result, persistence });
    }

    const result = await callJsonAgent({
      system: agentPrompts.conversation,
      user: JSON.stringify(input),
      schema: conversationReplySchema,
    });
    await logAiRequest({ agentType: "conversation", status: "success", meta: result.meta });

    return okJson(result);
  } catch (error) {
    await logAiRequest({ agentType: "conversation", status: "failed", error });
    return errorJson(error);
  }
}
