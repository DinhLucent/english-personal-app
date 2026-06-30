"use client";

import { useState, Suspense } from "react";
import { BookOpenCheck, CheckCircle2, Loader2, Mic, WandSparkles, Repeat2 } from "lucide-react";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import { CopyTextButton, OutputActionLink, OutputActionRow } from "@/components/output-actions";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  LoadingState,
  OutputCard,
  PageHeader,
  Panel,
  ResultHeader,
  Select,
  SectionHeading,
  StateNotice,
  TextInput,
} from "@/components/ui";
import { postJson } from "@/lib/client-api";
import { sampleDailyLesson } from "@/lib/demo-data";
import type { DailyLesson } from "@/lib/ai/schemas";
import { fireConfetti } from "@/lib/confetti";
import { playSoundCue } from "@/lib/sound";

function DailyPageContent() {
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
    setCompleteMessage(null);
    changeTab("lesson");

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
      void playSoundCue("feedback-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate lesson.");
      changeTab("setup");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  async function completeLesson() {
    if (!lessonId) {
      setCompleteMessage("Generate and save a Supabase-backed lesson before completing it.");
      void playSoundCue("error");
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
      localStorage.setItem("speakflow:daily-completed", "true");
      window.dispatchEvent(new Event("speakflow:progress-update"));
      fireConfetti();
      void playSoundCue("complete");
    } catch (err) {
      setCompleteMessage(err instanceof Error ? err.message : "Could not complete lesson.");
      void playSoundCue("error");
    } finally {
      setCompleting(false);
    }
  }

  const tabs = [
    { id: "setup", label: "Setup", icon: <WandSparkles size={16} /> },
    { id: "lesson", label: "Lesson", icon: <BookOpenCheck size={16} /> },
    { id: "patterns", label: "Patterns", icon: <Repeat2 size={16} /> },
    { id: "practice", label: "Practice", icon: <CheckCircle2 size={16} /> },
    { id: "preview", label: "Preview", icon: <BookOpenCheck size={16} /> },
  ];

  const validTabs = ["setup", "lesson", "patterns", "practice", "preview"];
  const [activeTab, changeTab] = useTabSync("setup", validTabs);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Daily Lesson"
        title="Generate one focused lesson for today"
        description="The same lesson is reused for your personal day and saved with completion progress."
        action={
          <Button
            onClick={generateLesson}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
          >
            {loading ? "Generating" : "Generate"}
          </Button>
        }
      />

      <PageTabs tabs={tabs} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "setup" && (
        <div className="grid items-start gap-4 animate-fadeIn xl:grid-cols-[minmax(0,1fr)_380px]" role="tabpanel" id="tabpanel-setup" aria-labelledby="tab-setup">
          <Panel>
            <SectionHeading
              title="Lesson inputs"
              description="Keep the lesson narrow enough to reuse immediately in speaking and writing practice."
              action={
                <Button
                  variant="secondary"
                  onClick={generateLesson}
                  disabled={loading}
                  icon={loading ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
                >
                  {loading ? "Generating" : "Generate lesson"}
                </Button>
              }
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
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
              <div className="space-y-2 md:col-span-2">
                <FieldLabel htmlFor="focus">Today focus</FieldLabel>
                <TextInput id="focus" value={focus} onChange={(event) => setFocus(event.target.value)} />
              </div>
            </div>
            {error ? (
              <StateNotice
                className="mt-4"
                role="alert"
                tone="danger"
                title="Daily lesson could not be generated"
                description={error}
              />
            ) : null}
          </Panel>
          <DailySetupPreview
            jobRole={jobRole}
            level={level}
            focus={focus}
            loading={loading}
            onGenerate={generateLesson}
          />
        </div>
      )}

      {activeTab === "lesson" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-lesson" aria-labelledby="tab-lesson">
          {loading ? (
            <Panel>
              <LoadingState
                title="Building today's lesson"
                description="Preparing vocabulary, patterns, speaking prompts, and the writing task for your current focus."
                rows={4}
              />
            </Panel>
          ) : lesson ? (
            <div className="space-y-6">
              <Panel>
                <ResultHeader
                  eyebrow="Generated lesson"
                  title={lesson.title}
                  description={lesson.summaryVi}
                  badges={
                    <>
                      <Badge tone="brand">{lesson.level}</Badge>
                      {persistenceNote ? <Badge tone="neutral">{persistenceNote}</Badge> : null}
                    </>
                  }
                  metric={{
                    label: "Words",
                    value: String(lesson.vocabulary.length),
                    detail: "in context",
                    tone: "blue",
                  }}
                />
                <OutputActionRow>
                  <CopyTextButton text={formatLessonCopy(lesson)} label="Copy lesson" tone="brand" />
                  <OutputActionLink href="/speaking" label="Practice speaking" icon={Mic} tone="blue" />
                </OutputActionRow>
                <SectionHeading
                  className="mt-5"
                  title="Vocabulary in context"
                  description="Scan the word, Vietnamese meaning, and a sentence you can reuse at work."
                />
                <div className="mt-6 grid gap-3">
                  {lesson.vocabulary.map((item) => (
                    <OutputCard
                      key={item.word}
                      title={item.word}
                      description={item.meaningVi}
                      badge={<Badge tone="blue">{item.topic}</Badge>}
                    >
                      <p className="font-medium text-foreground">{item.example}</p>
                      <OutputActionRow>
                        <CopyTextButton text={`${item.word}: ${item.example}`} label="Copy example" />
                      </OutputActionRow>
                    </OutputCard>
                  ))}
                </div>
              </Panel>
            </div>
          ) : (
            <DailyLessonRequiredState
              title="Generate the lesson first"
              description="The Lesson tab will hold vocabulary, meaning, examples, and copy actions once today's lesson is ready."
              jobRole={jobRole}
              level={level}
              focus={focus}
              loading={loading}
              onGenerate={generateLesson}
              onSetup={() => changeTab("setup")}
            />
          )}
        </div>
      )}

      {activeTab === "patterns" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-patterns" aria-labelledby="tab-patterns">
          {lesson ? (
            <Panel>
              <SectionHeading
                title="Sentence patterns"
                description="Reusable frames for standups, blockers, and updates."
              />
              <div className="mt-4 grid gap-3">
                {lesson.sentencePatterns.map((pattern) => (
                  <OutputCard
                    key={pattern.pattern}
                    title={pattern.pattern}
                    description={pattern.meaningVi}
                    tone="neutral"
                  >
                    <p className="font-medium text-foreground">{pattern.example}</p>
                    <OutputActionRow>
                      <CopyTextButton text={`${pattern.pattern}\n${pattern.example}`} label="Copy pattern" />
                    </OutputActionRow>
                  </OutputCard>
                ))}
              </div>
            </Panel>
          ) : (
            <DailyLessonRequiredState
              title="Patterns need a generated lesson"
              description="Generate once, then this tab will show reusable sentence frames from the same workplace focus."
              jobRole={jobRole}
              level={level}
              focus={focus}
              loading={loading}
              onGenerate={generateLesson}
              onSetup={() => changeTab("setup")}
            />
          )}
        </div>
      )}

      {activeTab === "practice" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-practice" aria-labelledby="tab-practice">
          {lesson ? (
            <Panel>
              <SectionHeading
                title="Speaking and writing"
                description="Turn the lesson into a short active practice set."
              />
              <ol className="mt-4 grid gap-2 text-sm leading-6">
                {lesson.speakingQuestions.map((question, index) => (
                  <li key={question} className="grid grid-cols-[auto_1fr] gap-2 rounded-card bg-panel-muted px-3 py-2.5">
                    <Badge tone="brand">Q{index + 1}</Badge>
                    <span className="min-w-0">{question}</span>
                  </li>
                ))}
              </ol>
              <OutputCard className="mt-4" title="Writing task" tone="blue">
                <p>{lesson.writingTask}</p>
                <OutputActionRow>
                  <CopyTextButton text={lesson.writingTask} label="Copy task" tone="blue" />
                </OutputActionRow>
              </OutputCard>
              <Button
                className="mt-4 w-full"
                onClick={completeLesson}
                disabled={completing}
                icon={completing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              >
                {completing ? "Saving progress" : "Complete Lesson"}
              </Button>
              {completeMessage ? (
                <StateNotice
                  className="mt-3"
                  tone={completeMessage.includes("completed") ? "success" : "warning"}
                  title={completeMessage.includes("completed") ? "Daily progress saved" : "Completion needs storage"}
                  description={completeMessage}
                />
              ) : null}
            </Panel>
          ) : (
            <DailyLessonRequiredState
              title="Practice unlocks after generation"
              description="Speaking prompts and the writing task are created from the generated vocabulary and sentence patterns."
              jobRole={jobRole}
              level={level}
              focus={focus}
              loading={loading}
              onGenerate={generateLesson}
              onSetup={() => changeTab("setup")}
            />
          )}
        </div>
      )}

      {activeTab === "preview" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-preview" aria-labelledby="tab-preview">
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
                    <div key={item.word} className="rounded-card border border-line p-4">
                      <p className="font-semibold">{item.word}</p>
                      <p className="mt-1 text-sm text-muted">{item.example}</p>
                    </div>
                  ))}
                </div>
              </div>
              <EmptyState
                tone="info"
                icon={<WandSparkles size={18} />}
                title="Waiting for generated lesson"
                description="Generate a lesson with your current role and focus. It will be saved to your personal day when storage is available."
                action={
                  <Button variant="secondary" onClick={generateLesson} disabled={loading} icon={<WandSparkles size={16} />}>
                    Generate now
                  </Button>
                }
              />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function DailySetupPreview({
  jobRole,
  level,
  focus,
  loading,
  onGenerate,
}: {
  jobRole: string;
  level: string;
  focus: string;
  loading: boolean;
  onGenerate: () => void;
}) {
  const previewSteps = [
    {
      title: "Lesson",
      description: "Vocabulary with Vietnamese meaning and reusable examples.",
      icon: BookOpenCheck,
    },
    {
      title: "Patterns",
      description: "Sentence frames matched to the same focus.",
      icon: Repeat2,
    },
    {
      title: "Practice",
      description: "Speaking questions plus one writing task.",
      icon: CheckCircle2,
    },
  ];

  return (
    <Panel className="h-fit bg-[linear-gradient(135deg,var(--surface-panel-soft),rgba(17,127,98,0.08))]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Daily route</p>
          <h2 className="mt-1 text-lg font-semibold">One lesson, four tabs</h2>
        </div>
        <Badge tone="brand">{level}</Badge>
      </div>

      <div className="mt-4 grid gap-2 rounded-card border border-line/70 bg-white/75 p-3 text-sm leading-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-soft">Role</p>
          <p className="mt-1 font-semibold">{jobRole}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-soft">Focus</p>
          <p className="mt-1 font-semibold">{focus}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        {previewSteps.map((step) => {
          const Icon = step.icon;

          return (
            <div key={step.title} className="grid grid-cols-[auto_1fr] gap-3 rounded-card border border-line/60 bg-white/80 p-3">
              <span className="flex size-9 items-center justify-center rounded-control bg-brand/10 text-brand">
                <Icon size={17} />
              </span>
              <div>
                <p className="font-semibold">{step.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        className="mt-4 w-full"
        onClick={onGenerate}
        disabled={loading}
        icon={loading ? <Loader2 className="animate-spin" size={18} /> : <WandSparkles size={18} />}
      >
        {loading ? "Generating" : "Generate focused lesson"}
      </Button>
    </Panel>
  );
}

function DailyLessonRequiredState({
  title,
  description,
  jobRole,
  level,
  focus,
  loading,
  onGenerate,
  onSetup,
}: {
  title: string;
  description: string;
  jobRole: string;
  level: string;
  focus: string;
  loading: boolean;
  onGenerate: () => void;
  onSetup: () => void;
}) {
  const previewItems = [
    { label: "Role", value: jobRole },
    { label: "Level", value: level },
    { label: "Focus", value: focus },
  ];

  return (
    <Panel className="border-brand/20 bg-brand/[0.035]">
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <SectionHeading
            title={title}
            description={description}
            action={
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={onGenerate}
                  disabled={loading}
                  icon={loading ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
                >
                  {loading ? "Generating" : "Generate lesson"}
                </Button>
                <Button variant="secondary" onClick={onSetup} disabled={loading} icon={<BookOpenCheck size={16} />}>
                  Edit setup
                </Button>
              </div>
            }
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {previewItems.map((item) => (
              <div key={item.label} className="rounded-card border border-line/70 bg-white/85 p-3 text-sm leading-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-soft">{item.label}</p>
                <p className="mt-1 font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-line/70 bg-white/85 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-soft">Next output</p>
          <div className="mt-3 grid gap-2 text-sm leading-6">
            <div className="rounded-card bg-panel-muted p-3">
              <span className="font-semibold text-foreground">Vocabulary</span>
              <span className="block text-muted">Words with Vietnamese meaning and workplace examples.</span>
            </div>
            <div className="rounded-card bg-panel-muted p-3">
              <span className="font-semibold text-foreground">Patterns</span>
              <span className="block text-muted">Reusable sentence frames for the selected focus.</span>
            </div>
            <div className="rounded-card bg-panel-muted p-3">
              <span className="font-semibold text-foreground">Practice</span>
              <span className="block text-muted">Speaking questions plus one writing task.</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function formatLessonCopy(lesson: DailyLesson) {
  const vocabulary = lesson.vocabulary
    .map((item) => `- ${item.word}: ${item.meaningVi}. ${item.example}`)
    .join("\n");
  const patterns = lesson.sentencePatterns
    .map((pattern) => `- ${pattern.pattern}: ${pattern.example}`)
    .join("\n");
  const questions = lesson.speakingQuestions
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");

  return [
    lesson.title,
    lesson.summaryVi,
    "",
    "Vocabulary:",
    vocabulary,
    "",
    "Patterns:",
    patterns,
    "",
    "Speaking:",
    questions,
    "",
    `Writing: ${lesson.writingTask}`,
  ].join("\n");
}

export default function DailyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <DailyPageContent />
    </Suspense>
  );
}
