"use client";

import { useState } from "react";
import { BookOpenCheck, CheckCircle2, Loader2, WandSparkles } from "lucide-react";
import {
  Button,
  EmptyState,
  FieldLabel,
  PageHeader,
  Panel,
  Select,
  TextInput,
} from "@/components/ui";
import { postJson } from "@/lib/client-api";
import { sampleDailyLesson } from "@/lib/demo-data";
import type { DailyLesson } from "@/lib/ai/schemas";

export default function DailyPage() {
  const [jobRole, setJobRole] = useState("software developer");
  const [level, setLevel] = useState("A2");
  const [focus, setFocus] = useState("meetings and daily standup");
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [persistenceNote, setPersistenceNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function generateLesson() {
    setLoading(true);
    setError(null);

    try {
      const result = await postJson<DailyLesson>("/api/ai/daily-lesson", {
        dayNumber: 1,
        level,
        jobRole,
        focus,
      });
      setLesson(result.data);
      setLessonId(result.persistence?.id ?? null);
      setPersistenceNote(
        result.persistence?.saved
          ? "Saved to Supabase."
          : result.persistence?.reason ?? "Generated but not saved yet.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate lesson.");
    } finally {
      setLoading(false);
    }
  }

  async function completeLesson() {
    if (!lessonId) {
      setCompleteMessage("Generate and save a Supabase-backed lesson before completing it.");
      return;
    }

    setCompleting(true);
    setCompleteMessage(null);

    try {
      const response = await fetch("/api/progress/complete-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId,
          score: 85,
          minutesSpent: 25,
        }),
      });
      const json = await response.json();

      if (!json.ok) {
        throw new Error(json.error.message);
      }

      setCompleteMessage("Lesson completed and progress updated.");
    } catch (err) {
      setCompleteMessage(err instanceof Error ? err.message : "Could not complete lesson.");
    } finally {
      setCompleting(false);
    }
  }

  const visibleLesson = lesson;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily Lesson"
        title="Generate one focused lesson for today"
        description="The final version will reuse the same lesson for each user/day and save completion to Supabase."
        action={
          <Button
            onClick={generateLesson}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          >
            Generate
          </Button>
        }
      />

      <Panel>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <FieldLabel htmlFor="jobRole">Job role</FieldLabel>
            <TextInput
              id="jobRole"
              value={jobRole}
              onChange={(event) => setJobRole(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="level">Level</FieldLabel>
            <Select id="level" value={level} onChange={(event) => setLevel(event.target.value)}>
              <option>A1</option>
              <option>A2</option>
              <option>B1</option>
              <option>B2</option>
            </Select>
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="focus">Today focus</FieldLabel>
            <TextInput id="focus" value={focus} onChange={(event) => setFocus(event.target.value)} />
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm leading-6 text-[#7b3f34]">
            {error}
          </div>
        ) : null}
      </Panel>

      {visibleLesson ? (
        <LessonView
          lesson={visibleLesson}
          persistenceNote={persistenceNote}
          completeMessage={completeMessage}
          completing={completing}
          onComplete={completeLesson}
        />
      ) : (
        <Panel>
          <div className="mb-5 flex items-center gap-3">
            <BookOpenCheck className="text-brand" size={20} />
            <h2 className="text-lg font-semibold">Preview structure</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="font-semibold">{sampleDailyLesson.title}</h3>
              <div className="mt-4 grid gap-3">
                {sampleDailyLesson.vocabulary.map((item) => (
                  <div key={item.word} className="rounded-[8px] border border-line p-4">
                    <p className="font-semibold">{item.word}</p>
                    <p className="mt-1 text-sm text-[#66716c]">{item.example}</p>
                  </div>
                ))}
              </div>
            </div>
            <EmptyState
              title="Waiting for generated lesson"
              description="Add DEEPSEEK_API_KEY to generate a real lesson. After Supabase is connected, the lesson will be saved per user/day."
            />
          </div>
        </Panel>
      )}
    </div>
  );
}

function LessonView({
  lesson,
  persistenceNote,
  completeMessage,
  completing,
  onComplete,
}: {
  lesson: DailyLesson;
  persistenceNote: string | null;
  completeMessage: string | null;
  completing: boolean;
  onComplete: () => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel>
        <p className="text-sm font-semibold text-brand">{lesson.level}</p>
        <h2 className="mt-2 text-2xl font-semibold">{lesson.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#66716c]">{lesson.summaryVi}</p>
        {persistenceNote ? (
          <p className="mt-4 rounded-[8px] border border-line bg-panel-muted p-3 text-sm text-[#56635d]">
            {persistenceNote}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3">
          {lesson.vocabulary.map((item) => (
            <div key={item.word} className="rounded-[8px] border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{item.word}</p>
                <span className="rounded-full bg-panel-muted px-3 py-1 text-xs font-semibold text-brand">
                  {item.topic}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#66716c]">{item.meaningVi}</p>
              <p className="mt-2 text-sm">{item.example}</p>
            </div>
          ))}
        </div>
      </Panel>
      <div className="grid gap-4">
        <Panel>
          <h3 className="font-semibold">Sentence patterns</h3>
          <div className="mt-4 grid gap-3">
            {lesson.sentencePatterns.map((pattern) => (
              <div key={pattern.pattern} className="rounded-[8px] border border-line p-4 text-sm">
                <p className="font-semibold">{pattern.pattern}</p>
                <p className="mt-1 text-[#66716c]">{pattern.meaningVi}</p>
                <p className="mt-2">{pattern.example}</p>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <h3 className="font-semibold">Speaking and writing</h3>
          <ul className="mt-4 grid gap-2 text-sm leading-6">
            {lesson.speakingQuestions.map((question) => (
              <li key={question} className="rounded-[8px] bg-panel-muted px-3 py-2">
                {question}
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-[8px] border border-line p-4 text-sm">{lesson.writingTask}</p>
          <Button
            className="mt-4 w-full"
            onClick={onComplete}
            disabled={completing}
            icon={completing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
          >
            Complete Lesson
          </Button>
          {completeMessage ? (
            <p className="mt-3 rounded-[8px] border border-line bg-panel-muted p-3 text-sm text-[#56635d]">
              {completeMessage}
            </p>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
