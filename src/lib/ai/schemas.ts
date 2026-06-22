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

export type DailyLesson = z.infer<typeof dailyLessonSchema>;
export type CorrectionResult = z.infer<typeof correctionSchema>;
export type ConversationReply = z.infer<typeof conversationReplySchema>;
export type ConversationSummary = z.infer<typeof conversationSummarySchema>;
export type VocabularyBatch = z.infer<typeof vocabularyBatchSchema>;
export type GrammarLesson = z.infer<typeof grammarLessonSchema>;
export type ReflexSession = z.infer<typeof reflexSessionSchema>;
export type ReflexFeedback = z.infer<typeof reflexFeedbackSchema>;
export type AssessmentResult = z.infer<typeof assessmentSchema>;
