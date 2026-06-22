import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api";
import {
  getAssessmentHistory,
  getCorrectionHistory,
  getSessionHistory,
  getVocabularyHistory,
} from "@/lib/history";

const historyLoaders = {
  corrections: getCorrectionHistory,
  vocabulary: getVocabularyHistory,
  sessions: getSessionHistory,
  assessments: getAssessmentHistory,
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") || "10"), 50);

  if (
    type !== "corrections" &&
    type !== "vocabulary" &&
    type !== "sessions" &&
    type !== "assessments"
  ) {
    return NextResponse.json(fail("invalid_history_type", "Unknown history type."), {
      status: 400,
    });
  }

  const history = await historyLoaders[type](limit);
  return NextResponse.json(ok(history));
}
