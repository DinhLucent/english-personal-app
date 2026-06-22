"use client";

import { useState } from "react";
import { Loader2, Repeat2 } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, Panel, TextInput } from "@/components/ui";
import { postJson } from "@/lib/client-api";
import type { ReflexFeedback, ReflexSession } from "@/lib/ai/schemas";

export default function ReflexPage() {
  const [topic, setTopic] = useState("work and daily life");
  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<ReflexFeedback | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateQuestions() {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await postJson<ReflexSession>("/api/ai/reflex", { mode: "questions", topic });
      setQuestions(response.data.questions);
      setIndex(0);
      setScores([]);
      setSaveMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate questions.");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    const question = questions[index];
    if (!question) return;
    setLoading(true);
    setError(null);
    try {
      const response = await postJson<ReflexFeedback>("/api/ai/reflex", {
        mode: "feedback",
        topic,
        question,
        answer,
      });
      setFeedback(response.data);
      const nextScores = [...scores, response.data.score];
      setScores(nextScores);
      setAnswer("");
      const nextIndex = Math.min(index + 1, questions.length - 1);
      setIndex(nextIndex);

      if (index + 1 >= questions.length) {
        await saveCompletedSession(nextScores);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check answer.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCompletedSession(finalScores: number[]) {
    const averageScore = finalScores.length
      ? Math.round(finalScores.reduce((sum, score) => sum + score, 0) / finalScores.length)
      : undefined;

    try {
      const response = await fetch("/api/progress/save-practice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reflex",
          difficulty: topic,
          score: averageScore,
          minutesSpent: 10,
          summary: {
            topic,
            questionsCompleted: questions.length,
            averageScore,
          },
        }),
      });
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error.message);
      }

      setSaveMessage("Reflex session saved to Supabase.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Could not save reflex session.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reflex"
        title="Answer short questions quickly"
        description="Generate a 20-question drill, answer one question at a time, and get correction plus a natural answer."
        action={
          <Button onClick={generateQuestions} disabled={loading} icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Repeat2 size={18} />}>
            Generate Drill
          </Button>
        }
      />
      <Panel>
        <div className="max-w-md space-y-2">
          <FieldLabel htmlFor="topic">Topic</FieldLabel>
          <TextInput id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
        </div>
        {error ? <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm text-[#7b3f34]">{error}</div> : null}
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel>
          {questions.length ? (
            <div>
              <p className="text-sm font-semibold text-brand">Question {index + 1} of {questions.length}</p>
              <h2 className="mt-3 text-2xl font-semibold">{questions[index]}</h2>
              <div className="mt-5 flex gap-3">
                <TextInput value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer fast..." />
                <Button onClick={submitAnswer} disabled={loading || answer.trim().length < 1}>Check</Button>
              </div>
              <p className="mt-3 text-sm text-[#66716c]">
                Answered {scores.length} of {questions.length}
              </p>
              {saveMessage ? (
                <p className="mt-3 rounded-[8px] border border-line bg-panel-muted p-3 text-sm text-[#56635d]">
                  {saveMessage}
                </p>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No drill yet" description="Generate questions when DeepSeek is connected." />
          )}
        </Panel>
        <Panel>
          <h2 className="font-semibold">Feedback</h2>
          {feedback ? (
            <div className="mt-4 space-y-3 text-sm leading-6">
              <p><span className="font-semibold">Correction:</span> {feedback.correction}</p>
              <p><span className="font-semibold">Natural:</span> {feedback.naturalAnswer}</p>
              <p><span className="font-semibold">Score:</span> {feedback.score}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#66716c]">Feedback appears after each answer.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
