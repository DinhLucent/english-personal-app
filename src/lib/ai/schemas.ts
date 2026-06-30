import { z } from "zod";

export const vocabularyItemSchema = z.object({
  word: z.string(),
  meaningVi: z.string(),
  example: z.string(),
  topic: z.string(),
  usageNoteVi: z.string(),
});

export const dailyLessonSchema = z.object({
  title: z.string(),
  level: z.string(),
  vocabulary: z.array(vocabularyItemSchema).min(3).max(10),
  sentencePatterns: z.array(
    z.object({
      pattern: z.string(),
      meaningVi: z.string(),
      example: z.string(),
    }),
  ),
  speakingQuestions: z.array(z.string()).min(3).max(8),
  writingTask: z.string(),
  exercises: z.array(
    z.object({
      prompt: z.string(),
      answer: z.string(),
    }),
  ),
  summaryVi: z.string(),
});

export const correctionSchema = z.object({
  original: z.string(),
  corrected: z.string(),
  natural: z.string(),
  mistakes: z.array(
    z.object({
      text: z.string(),
      issue: z.string(),
      fix: z.string(),
      explanationVi: z.string(),
    }),
  ),
  score: z.number().min(0).max(100),
});

export const conversationReplySchema = z.object({
  reply: z.string(),
  correction: z.string(),
  naturalAnswer: z.string(),
  nextQuestion: z.string(),
  score: z.number().min(0).max(100),
});

export const conversationSummarySchema = z.object({
  summaryVi: z.string(),
  strengths: z.array(z.string()),
  mistakesToReview: z.array(z.string()),
  suggestedNextPractice: z.string(),
  score: z.number().min(0).max(100),
});

export const vocabularyBatchSchema = z.object({
  topic: z.string(),
  items: z.array(vocabularyItemSchema).min(5).max(12),
});

export const grammarLessonSchema = z.object({
  topic: z.string(),
  explanationVi: z.string(),
  dailyExamples: z.array(z.string()).min(2),
  workExamples: z.array(z.string()).min(2),
  exercise: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
    }),
  ),
});

export const reflexSessionSchema = z.object({
  questions: z.array(z.string()).min(10).max(20),
});

export const reflexFeedbackSchema = z.object({
  correction: z.string(),
  naturalAnswer: z.string(),
  nextQuestion: z.string(),
  score: z.number().min(0).max(100),
});

export const assessmentSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2"]),
  scores: z.object({
    vocabulary: z.number().min(0).max(100),
    grammar: z.number().min(0).max(100),
    communication: z.number().min(0).max(100),
    writing: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  nextSevenDays: z.array(
    z.object({
      day: z.number().min(1).max(7),
      focus: z.string(),
      task: z.string(),
    }),
  ),
});

export const speakingScoreSchema = z.object({
  taskCompletion: z.number().min(0).max(5),
  fluency: z.number().min(0).max(5),
  accuracy: z.number().min(0).max(5),
  vocabulary: z.number().min(0).max(5),
  interaction: z.number().min(0).max(5),
});

export const speakingInputModeSchema = z.enum(["typed", "voice"]);

export const speakingVoiceMetricsSchema = z.object({
  recordingMs: z.number().int().min(0).max(600000).nullable().optional(),
  wordCount: z.number().int().min(0).max(2000),
  wordsPerMinute: z.number().min(0).max(400).nullable().optional(),
  transcriptEdited: z.boolean().default(false),
  attemptLengthSignal: z.enum(["too_short", "focused", "long"]),
});

export const speakingDeliverySignalsSchema = z
  .object({
    inputMode: speakingInputModeSchema.default("typed"),
    lengthSignal: z.string(),
    paceSignal: z.string(),
    transcriptSignal: z.string(),
    nextVoiceAction: z.string(),
  })
  .default({
    inputMode: "typed",
    lengthSignal: "No voice delivery signal was provided.",
    paceSignal: "Pace was not measured for this answer.",
    transcriptSignal: "Typed fallback or transcript editing was used.",
    nextVoiceAction: "Practice the retry out loud, then submit the edited transcript.",
  });

const reviewCandidateTypeMap: Record<string, "error" | "chunk" | "vocabulary" | "answer"> = {
  answer: "answer",
  betteranswer: "answer",
  chunk: "chunk",
  correction: "error",
  error: "error",
  expression: "chunk",
  grammar: "error",
  mistake: "error",
  mistakes: "error",
  modelanswer: "answer",
  naturalanswer: "answer",
  pattern: "chunk",
  phrase: "chunk",
  sampleanswer: "answer",
  sentence: "answer",
  sentencepattern: "chunk",
  usefulchunk: "chunk",
  vocab: "vocabulary",
  vocabulary: "vocabulary",
  word: "vocabulary",
};

function firstString(values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeReviewCandidate(candidate: unknown) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return candidate;
  }

  const record = candidate as Record<string, unknown>;
  const rawType = firstString([
    record.type,
    record.sourceType,
    record.kind,
    record.category,
  ]);
  const typeKey = rawType?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

  return {
    ...record,
    type: reviewCandidateTypeMap[typeKey] ?? rawType,
    content: firstString([
      record.content,
      record.text,
      record.error,
      record.mistake,
      record.chunk,
      record.phrase,
      record.word,
      record.answer,
      record.modelAnswer,
      record.betterAnswer,
      record.naturalAnswer,
      record.correctForm,
      record.fix,
    ]),
    meaningVi: firstString([
      record.meaningVi,
      record.meaning,
      record.translationVi,
      record.explanationVi,
    ]),
    errorPattern: firstString([
      record.errorPattern,
      record.pattern,
      record.error,
      record.mistake,
      record.original,
    ]),
    correctForm: firstString([
      record.correctForm,
      record.fix,
      record.corrected,
      record.natural,
      record.naturalAnswer,
    ]),
  };
}

export const speakingReviewCandidateSchema = z.preprocess(
  normalizeReviewCandidate,
  z.object({
    type: z.enum(["error", "chunk", "vocabulary", "answer"]),
    content: z.string(),
    meaningVi: z.string().optional(),
    example: z.string().optional(),
    errorPattern: z.string().optional(),
    correctForm: z.string().optional(),
  }),
);

export const speakingRoleplayReplySchema = z.object({
  reply: z.string(),
  nextQuestion: z.string(),
  expectedFocus: z.string(),
  suggestedChunks: z.array(z.string()).max(4),
});

export const speakingFeedbackSchema = z.object({
  scores: speakingScoreSchema,
  mainIssue: z.string(),
  evidence: z.array(z.string()).min(1).max(5),
  betterAnswer: z.string(),
  deliverySignals: speakingDeliverySignalsSchema,
  retryTask: z.object({
    prompt: z.string(),
    requiredChunks: z.array(z.string()).min(1).max(4),
    successCriteria: z.array(z.string()).min(1).max(5),
  }),
  reviewCandidates: z.array(speakingReviewCandidateSchema).max(8),
});

export const speakingRetryFeedbackSchema = z.object({
  improved: z.boolean(),
  comparisonVi: z.string(),
  scores: speakingScoreSchema,
  remainingIssue: z.string(),
  nextAction: z.string(),
  deliverySignals: speakingDeliverySignalsSchema,
  reviewCandidates: z.array(speakingReviewCandidateSchema).max(8),
});

export type DailyLesson = z.infer<typeof dailyLessonSchema>;
export type CorrectionResult = z.infer<typeof correctionSchema>;
export type ConversationReply = z.infer<typeof conversationReplySchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type VocabularyBatch = z.infer<typeof vocabularyBatchSchema>;
export type GrammarLesson = z.infer<typeof grammarLessonSchema>;
export type ReflexSession = z.infer<typeof reflexSessionSchema>;
export type ReflexFeedback = z.infer<typeof reflexFeedbackSchema>;
export type AssessmentResult = z.infer<typeof assessmentSchema>;
export type SpeakingScores = z.infer<typeof speakingScoreSchema>;
export type SpeakingInputMode = z.infer<typeof speakingInputModeSchema>;
export type SpeakingVoiceMetrics = z.infer<typeof speakingVoiceMetricsSchema>;
export type SpeakingDeliverySignals = z.infer<
  typeof speakingDeliverySignalsSchema
>;
export type SpeakingReviewCandidate = z.infer<
  typeof speakingReviewCandidateSchema
>;
export type SpeakingRoleplayReply = z.infer<typeof speakingRoleplayReplySchema>;
export type SpeakingFeedback = z.infer<typeof speakingFeedbackSchema>;
export type SpeakingRetryFeedback = z.infer<typeof speakingRetryFeedbackSchema>;
