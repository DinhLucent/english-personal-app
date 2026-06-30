"use client";

import { useState, Suspense } from "react";
import { Loader2, Repeat2, PenLine, Sparkles } from "lucide-react";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  LoadingState,
  PageHeader,
  Panel,
  ProgressRing,
  StateNotice,
  TextInput,
} from "@/components/ui";
import { postJson } from "@/lib/client-api";
import type { ReflexFeedback, ReflexSession } from "@/lib/ai/schemas";
import { fireConfetti } from "@/lib/confetti";
import { emitLearningEvent } from "@/lib/learning-events";
import { playSoundCue } from "@/lib/sound";

function focusElementSoon(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 80);
}

function ReflexPageContent() {
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
    emitLearningEvent({ kind: "start", target: "#reflex-generate-action", cue: "start", intensity: "micro" });
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await postJson<ReflexSession>("/api/ai/reflex", { mode: "questions", topic });
      setQuestions(response.data.questions);
      setIndex(0);
      setScores([]);
      setSaveMessage(null);
      focusElementSoon("reflex-answer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate questions.");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    const question = questions[index];
    if (!question) return;
    emitLearningEvent({ kind: "send", target: "#reflex-check-action", cue: "send", intensity: "micro" });
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
      emitLearningEvent({
        kind: "feedback",
        target: "#reflex-feedback-panel",
        cue: "feedback-ready",
        delayMs: 80,
      });

      if (index + 1 < questions.length) {
        focusElementSoon("reflex-answer");
      }

      if (index + 1 >= questions.length) {
        changeTab("session");
        await saveCompletedSession(nextScores);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check answer.");
      void playSoundCue("error");
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
      focusElementSoon("reflex-session-status");
      emitLearningEvent({
        kind: "complete",
        target: "#reflex-session-status",
        cue: "complete",
        intensity: "strong",
        delayMs: 80,
      });
      localStorage.setItem("speakflow:reflex-completed", "true");
      window.dispatchEvent(new Event("speakflow:progress-update"));
      fireConfetti({ soundCue: false });
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Could not save reflex session.");
      void playSoundCue("error");
    }
  }

  const progress = questions.length ? Math.round((scores.length / questions.length) * 100) : 0;
  const averageScore = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : null;
  const saveTone = saveMessage?.includes("saved") ? "success" : "warning";

  const tabItems = [
    { id: "drill", label: "Drill", icon: <Repeat2 size={16} /> },
    { id: "feedback", label: "Feedback", icon: <PenLine size={16} /> },
    { id: "session", label: "Session", icon: <Sparkles size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("drill", ["drill", "feedback", "session"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reflex"
        title="Answer short questions quickly"
        description="Generate a 20-question drill, answer one question at a time, and get correction plus a natural answer."
        action={
          <Button
            id="reflex-generate-action"
            onClick={generateQuestions}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Repeat2 size={18} />}
          >
            {loading && !questions.length ? "Generating" : "Generate Drill"}
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "drill" && (
        <div className="grid items-start gap-4 animate-fadeIn xl:grid-cols-[minmax(0,1fr)_360px]" role="tabpanel" id="tabpanel-drill" aria-labelledby="tab-drill">
          <div className="space-y-4">
          <Panel>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-xl flex-1 space-y-2">
                <FieldLabel htmlFor="topic">Topic</FieldLabel>
                <TextInput id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
              </div>
              <Button
                variant="secondary"
                onClick={generateQuestions}
                disabled={loading}
                icon={loading && !questions.length ? <Loader2 className="animate-spin" size={16} /> : <Repeat2 size={16} />}
              >
                {questions.length ? "Refresh drill" : "Generate drill"}
              </Button>
            </div>
            {error ? (
              <StateNotice
                className="mt-4"
                role="alert"
                tone="danger"
                title="Reflex request failed"
                description={error}
              />
            ) : null}
          </Panel>

          <Panel>
            {loading && !questions.length ? (
              <LoadingState
                title="Generating reflex drill"
                description="Preparing quick questions for your topic and difficulty rhythm."
                rows={4}
              />
            ) : questions.length ? (
              <div data-motion="completion">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge tone="brand">Question {index + 1} of {questions.length}</Badge>
                  <Badge tone={progress >= 100 ? "brand" : "neutral"}>{progress}% done</Badge>
                </div>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full bg-panel-muted"
                  role="progressbar"
                  aria-label="Reflex drill progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress}
                >
                  <div className="h-full rounded-full bg-brand transition-all duration-[var(--motion-learning-event)]" style={{ width: `${progress}%` }} />
                </div>
                <h2 id="reflex-question" className="mt-5 text-2xl font-semibold">{questions[index]}</h2>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="reflex-answer">Answer for current reflex question</label>
                  <TextInput
                    id="reflex-answer"
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Answer fast..."
                    aria-describedby="reflex-question reflex-answer-hint"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !loading && answer.trim()) {
                        event.preventDefault();
                        void submitAnswer();
                      }
                    }}
                  />
                  <Button
                    id="reflex-check-action"
                    onClick={submitAnswer}
                    disabled={loading || answer.trim().length < 1}
                    icon={loading ? <Loader2 className="animate-spin" size={16} /> : undefined}
                  >
                    Check
                  </Button>
                </div>
                <p id="reflex-answer-hint" className="mt-2 text-xs text-muted-soft">Press Enter to check your answer quickly.</p>
                <p className="mt-3 text-sm text-muted">Answered {scores.length} of {questions.length}</p>
              </div>
            ) : (
              <EmptyState
                tone="info"
                icon={<Repeat2 size={18} />}
                title="No drill yet"
                description="Generate questions for your topic, then answer one by one with quick feedback."
                action={
                  <Button variant="secondary" onClick={generateQuestions} disabled={loading} icon={<Repeat2 size={16} />}>
                    Generate drill
                  </Button>
                }
              />
            )}
          </Panel>
          </div>

          <ReflexDrillSupport
            topic={topic}
            questionCount={questions.length}
            answeredCount={scores.length}
            progress={progress}
            averageScore={averageScore}
            loading={loading}
          />
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-feedback" aria-labelledby="tab-feedback">
          <Panel>
            <div id="reflex-feedback-panel" className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Feedback</h2>
              {feedback ? <Badge tone="brand">Score {feedback.score}</Badge> : null}
            </div>
            {loading && questions.length ? (
              <LoadingState
                className="mt-4"
                title="Checking answer"
                description="Scoring the response and preparing a natural alternative."
                rows={2}
              />
            ) : feedback ? (
              <div data-motion="score" className="mt-4 space-y-3 text-sm leading-6">
                <p><span className="font-semibold">Correction:</span> {feedback.correction}</p>
                <p><span className="font-semibold">Natural:</span> {feedback.naturalAnswer}</p>
              </div>
            ) : (
              <EmptyState
                className="mt-4"
                title="Feedback appears after each answer"
                description="Answer one prompt on the Drill tab and the coach will show correction, natural answer, and score here."
              />
            )}
          </Panel>
        </div>
      )}

      {activeTab === "session" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-session" aria-labelledby="tab-session">
          <Panel>
            <h2 className="font-semibold">Session Status</h2>
            {saveMessage ? (
              <div id="reflex-session-status" tabIndex={-1}>
                <StateNotice
                  className="mt-3"
                  tone={saveTone}
                  title={saveTone === "success" ? "Reflex session saved" : "Reflex session needs attention"}
                  description={saveMessage}
                />
              </div>
            ) : (
              <EmptyState
                title="No session completed yet"
                description="Complete all questions in the generated drill to save progress and see summary scores."
              />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function ReflexDrillSupport({
  topic,
  questionCount,
  answeredCount,
  progress,
  averageScore,
  loading,
}: {
  topic: string;
  questionCount: number;
  answeredCount: number;
  progress: number;
  averageScore: number | null;
  loading: boolean;
}) {
  const hasDrill = questionCount > 0;
  const remaining = Math.max(questionCount - answeredCount, 0);
  const supportItems = hasDrill
    ? [
        {
          label: "Current rhythm",
          value: `${Math.min(answeredCount + 1, questionCount)} / ${questionCount}`,
          detail: "Answer the visible prompt, then keep focus in the box.",
        },
        {
          label: "Feedback tab",
          value: averageScore === null ? "Waiting" : `${averageScore} avg`,
          detail: "Latest correction and natural phrasing stay one tab away.",
        },
        {
          label: "Session tab",
          value: remaining === 0 ? "Ready" : `${remaining} left`,
          detail: "The set saves when the final prompt is checked.",
        },
      ]
    : [
        {
          label: "Topic",
          value: topic.trim() || "work and daily life",
          detail: "Questions stay inside this context.",
        },
        {
          label: "Answer loop",
          value: "One at a time",
          detail: "Use Enter for a fast check without leaving the input.",
        },
        {
          label: "Finish",
          value: "Saved set",
          detail: "Complete the generated set to update progress.",
        },
      ];

  return (
    <Panel className="h-fit">
      <div className="flex items-center gap-4">
        <ProgressRing
          value={hasDrill ? progress : 0}
          max={100}
          size={92}
          stroke={8}
          label={hasDrill ? "Drill" : "Ready"}
          detail={hasDrill ? `${answeredCount}/${questionCount}` : "new"}
          tone={hasDrill && progress >= 100 ? "brand" : "blue"}
        />
        <div className="min-w-0">
          <Badge tone={loading ? "amber" : hasDrill ? "brand" : "blue"}>
            {loading ? "Preparing" : hasDrill ? "Active loop" : "Drill setup"}
          </Badge>
          <h2 className="mt-2 text-lg font-semibold">
            {hasDrill ? "Keep the next answer moving" : "Generate once, answer in rhythm"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            {hasDrill
              ? "The drill tab stays focused on the current prompt while feedback and save status live in their own tabs."
              : "Pick a narrow topic, generate the set, then move through short answers without scrolling around."}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {supportItems.map((item) => (
          <div key={item.label} className="rounded-card border border-line/70 bg-panel-muted p-3 text-sm leading-5">
            <div className="flex items-start justify-between gap-3">
              <p className="font-semibold">{item.label}</p>
              <Badge tone="neutral">{item.value}</Badge>
            </div>
            <p className="mt-2 text-muted">{item.detail}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export default function ReflexPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <ReflexPageContent />
    </Suspense>
  );
}
