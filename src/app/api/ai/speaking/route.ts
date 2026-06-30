import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/api";
import { callJsonAgent } from "@/lib/ai/gateway";
import { agentPrompts } from "@/lib/ai/prompts";
import {
  speakingFeedbackSchema,
  speakingInputModeSchema,
  speakingRetryFeedbackSchema,
  speakingRoleplayReplySchema,
  speakingVoiceMetricsSchema,
} from "@/lib/ai/schemas";
import { errorJson, okJson, parseBody } from "@/lib/ai/route-utils";
import { getMissionById, type SpeakingMission } from "@/lib/missions";
import {
  logAiRequest,
  saveSpeakingFeedbackAttempt,
  saveSpeakingRetryAttempt,
  startSpeakingMissionAttempt,
} from "@/lib/supabase/persistence";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(1600),
});

const missionRequestBaseSchema = z.object({
  missionId: z.string().min(1).max(120),
  inputMode: speakingInputModeSchema.optional(),
  voiceMetrics: speakingVoiceMetricsSchema.optional(),
});

const requestSchema = z.discriminatedUnion("mode", [
  missionRequestBaseSchema.extend({
    mode: z.literal("roleplay"),
    messages: z.array(messageSchema).max(16).default([]),
  }),
  missionRequestBaseSchema.extend({
    mode: z.literal("feedback"),
    prompt: z.string().min(1).max(1200),
    userAnswer: z.string().min(2).max(3000),
    roleplayMessages: z.array(messageSchema).max(16).default([]),
  }),
  missionRequestBaseSchema.extend({
    mode: z.literal("retry-feedback"),
    originalAnswer: z.string().min(2).max(3000),
    retryAnswer: z.string().min(2).max(3000),
    retryOf: z.string().uuid().optional(),
    previousFeedback: speakingFeedbackSchema.optional(),
  }),
]);

function serializeMission(mission: SpeakingMission) {
  return {
    id: mission.id,
    dayNumber: mission.dayNumber,
    title: mission.title,
    goal: mission.goal,
    scenario: mission.scenario,
    roleplayPrompt: mission.roleplayPrompt,
    targetChunks: mission.targetChunks,
    targetVocabulary: mission.targetVocabulary,
    practiceQuestions: mission.practiceQuestions,
    rubric: mission.rubric,
  };
}

export async function POST(request: Request) {
  try {
    const input = await parseBody(request, requestSchema);
    const mission = getMissionById(input.missionId);

    if (!mission) {
      const error = new Error(`Mission not found: ${input.missionId}`);
      await logAiRequest({ agentType: "speaking", status: "failed", error });

      return NextResponse.json(
        fail("mission_not_found", "The requested speaking mission was not found."),
        { status: 404 },
      );
    }

    if (input.mode === "roleplay") {
      const result = await callJsonAgent({
        system: agentPrompts.speakingRoleplay,
        user: JSON.stringify({
          mission: serializeMission(mission),
          conversation: input.messages,
          instruction: input.messages.length
            ? "Continue the workplace roleplay from the latest learner answer."
            : "Start the workplace roleplay with a natural first turn.",
        }),
        schema: speakingRoleplayReplySchema,
        temperature: 0.5,
      });
      await logAiRequest({
        agentType: "speaking_roleplay",
        status: "success",
        meta: result.meta,
      });
      const persistence = await startSpeakingMissionAttempt({
        mission,
        currentStep: "roleplay",
      });

      return okJson({ ...result, persistence });
    }

    if (input.mode === "feedback") {
      const result = await callJsonAgent({
        system: agentPrompts.speakingFeedback,
        user: JSON.stringify({
          mission: serializeMission(mission),
          prompt: input.prompt,
          learnerAnswer: input.userAnswer,
          roleplayMessages: input.roleplayMessages,
          inputMode: input.inputMode ?? "typed",
          voiceMetrics: input.voiceMetrics ?? null,
          instruction:
            "Score the learner's answer against the mission goal and target chunks. Create a concrete retry task.",
        }),
        schema: speakingFeedbackSchema,
      });
      await logAiRequest({
        agentType: "speaking_feedback",
        status: "success",
        meta: result.meta,
      });
      const persistence = await saveSpeakingFeedbackAttempt({
        mission,
        prompt: input.prompt,
        userAnswer: input.userAnswer,
        feedback: result.data,
        inputMode: input.inputMode ?? "typed",
        voiceMetrics: input.voiceMetrics ?? null,
      });

      return okJson({ ...result, persistence });
    }

    const result = await callJsonAgent({
      system: agentPrompts.speakingRetryFeedback,
      user: JSON.stringify({
        mission: serializeMission(mission),
        originalAnswer: input.originalAnswer,
        retryAnswer: input.retryAnswer,
        previousFeedback: input.previousFeedback ?? null,
        inputMode: input.inputMode ?? "typed",
        voiceMetrics: input.voiceMetrics ?? null,
        instruction:
          "Compare the retry with the original answer and decide if it improved for this mission.",
      }),
      schema: speakingRetryFeedbackSchema,
    });
    await logAiRequest({
      agentType: "speaking_retry_feedback",
      status: "success",
      meta: result.meta,
    });
    const persistence = await saveSpeakingRetryAttempt({
      mission,
      prompt: input.previousFeedback?.retryTask.prompt ?? "Retry the speaking task.",
      retryAnswer: input.retryAnswer,
      retryFeedback: result.data,
      retryOf: input.retryOf ?? null,
      inputMode: input.inputMode ?? "typed",
      voiceMetrics: input.voiceMetrics ?? null,
    });

    return okJson({ ...result, persistence });
  } catch (error) {
    await logAiRequest({ agentType: "speaking", status: "failed", error });
    return errorJson(error);
  }
}
