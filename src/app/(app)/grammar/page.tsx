"use client";

import { useState, Suspense } from "react";
import { BookOpenCheck, CheckCircle2, Loader2, PenLine, Sparkles, SpellCheck } from "lucide-react";
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
} from "@/components/ui";
import { postJson } from "@/lib/client-api";
import type { GrammarLesson } from "@/lib/ai/schemas";
import { playSoundCue } from "@/lib/sound";

const topics = [
  "Present simple",
  "Past simple",
  "Present perfect",
  "Modal verbs",
  "Conditional sentences",
  "Comparatives",
  "Prepositions",
  "Articles",
];

const lessonPreview = [
  {
    title: "Explain",
    description: "Vietnamese explanation with the exact pattern to notice.",
  },
  {
    title: "Examples",
    description: "Daily and workplace sentences separated for fast scanning.",
  },
  {
    title: "Exercise",
    description: "Short prompts with answers for quick self-checking.",
  },
];

function GrammarPageContent() {
  const [topic, setTopic] = useState(topics[0]);
  const [lesson, setLesson] = useState<GrammarLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await postJson<GrammarLesson>("/api/ai/grammar", { topic, level: "A2" });
      setLesson(response.data);
      changeTab("explain");
      void playSoundCue("feedback-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate grammar lesson.");
      changeTab("setup");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  const tabItems = [
    { id: "setup", label: "Setup", icon: <SpellCheck size={16} /> },
    { id: "explain", label: "Explain", icon: <BookOpenCheck size={16} /> },
    { id: "exercise", label: "Exercise", icon: <PenLine size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("setup", ["setup", "explain", "exercise"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Grammar"
        title="Learn grammar through practical examples"
        description="Choose a topic and get a Vietnamese explanation, daily examples, work examples, exercises, and answers."
        action={
          <Button
            onClick={generate}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <SpellCheck size={18} />}
          >
            {loading ? "Generating" : "Generate"}
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "setup" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-setup" aria-labelledby="tab-setup">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Panel>
              <SectionHeading
                title="Lesson setup"
                description="Choose one pattern, then generate a focused explanation and practice set."
                action={
                  <Button
                    variant="secondary"
                    onClick={generate}
                    disabled={loading}
                    icon={loading ? <Loader2 className="animate-spin" size={16} /> : <SpellCheck size={16} />}
                  >
                    {loading ? "Generating" : "Generate lesson"}
                  </Button>
                }
              />
              <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,360px)_1fr]">
                <div className="space-y-2">
                  <FieldLabel htmlFor="topic">Topic</FieldLabel>
                  <Select id="topic" value={topic} onChange={(event) => setTopic(event.target.value)}>
                    {topics.map((item) => <option key={item}>{item}</option>)}
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-semibold">Quick topics</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {topics.slice(0, 6).map((item) => {
                      const selected = item === topic;

                      return (
                        <button
                          key={item}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setTopic(item)}
                          className={`rounded-chip border px-3 py-1.5 text-sm font-semibold transition ${
                            selected
                              ? "border-brand bg-brand text-white"
                              : "border-line bg-white text-muted hover:border-brand hover:text-brand"
                          }`}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {error ? (
                <StateNotice
                  className="mt-4"
                  role="alert"
                  tone="danger"
                  title="Grammar lesson could not be generated"
                  description={error}
                />
              ) : null}
            </Panel>
            <Panel className="border-violet/20 bg-violet/[0.04]">
              <SectionHeading
                title="Lesson shape"
                description="Generated content is split across tabs so explanation and practice do not compete for space."
              />
              <div className="mt-4 grid gap-3">
                {lessonPreview.map((item, index) => (
                  <div key={item.title} className="rounded-card border border-violet/15 bg-white/90 p-3 text-sm leading-6">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-control bg-violet/10 text-violet">
                        {index === 0 ? <BookOpenCheck size={15} /> : index === 1 ? <Sparkles size={15} /> : <PenLine size={15} />}
                      </span>
                      <p className="font-semibold">{item.title}</p>
                    </div>
                    <p className="mt-2 text-muted">{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-card border border-line/60 bg-white/80 p-3 text-sm leading-6">
                <CheckCircle2 className="text-violet" size={16} />
                <p className="mt-2 font-semibold text-foreground">Current focus: {topic}</p>
                <p className="mt-1 text-muted">Best for one short study block before using Correction or Speaking.</p>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "explain" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-explain" aria-labelledby="tab-explain">
          {loading ? (
            <Panel>
              <LoadingState
                title="Preparing grammar practice"
                description="Building a short explanation, examples, and exercises around your selected pattern."
                rows={4}
              />
            </Panel>
          ) : lesson ? (
            <div className="space-y-6">
              <Panel>
                <ResultHeader
                  eyebrow="Grammar pattern"
                  title={lesson.topic}
                  description={lesson.explanationVi}
                  badges={<Badge tone="violet">A2 pattern</Badge>}
                  metric={{
                    label: "Drills",
                    value: String(lesson.exercise.length),
                    detail: "quick checks",
                    tone: "violet",
                  }}
                />
                <OutputActionRow>
                  <CopyTextButton
                    text={`${lesson.topic}\n${lesson.explanationVi}`}
                    label="Copy pattern"
                    tone="violet"
                  />
                  <OutputActionLink href="/correction" label="Try in correction" icon={PenLine} tone="blue" />
                </OutputActionRow>
              </Panel>
              <ExampleList title="Daily examples" items={lesson.dailyExamples} />
              <ExampleList title="Work examples" items={lesson.workExamples} />
            </div>
          ) : (
            <EmptyState
              tone="info"
              icon={<SpellCheck size={18} />}
              title="No grammar lesson yet"
              description="Choose a topic on the Setup tab to generate an explanation and examples."
              action={
                <Button variant="secondary" onClick={generate} disabled={loading} icon={<SpellCheck size={16} />}>
                  Generate lesson
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === "exercise" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-exercise" aria-labelledby="tab-exercise">
          {lesson ? (
            <Panel>
              <SectionHeading
                title="Exercise"
                description="Use the answer line as a quick self-check after reading each prompt."
              />
              <div className="mt-3 grid gap-3">
                {lesson.exercise.map((item) => (
                  <OutputCard key={item.question} title={item.question} badge={<Badge tone="brand">Answer</Badge>}>
                    <p className="text-muted">{item.answer}</p>
                    <OutputActionRow>
                      <CopyTextButton text={`${item.question}\nAnswer: ${item.answer}`} label="Copy answer" />
                    </OutputActionRow>
                  </OutputCard>
                ))}
              </div>
            </Panel>
          ) : (
            <EmptyState
              tone="info"
              icon={<SpellCheck size={18} />}
              title="No exercise set yet"
              description="Generate a grammar lesson first to see exercises here."
            />
          )}
        </div>
      )}
    </div>
  );
}

function ExampleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <SectionHeading
        title={title}
        description="Read aloud and notice where the pattern changes."
        action={<CopyTextButton text={items.join("\n")} label="Copy set" tone="violet" />}
      />
      <div className="mt-3 grid gap-2">
        {items.map((item, index) => (
          <OutputCard key={item} title={`Example ${index + 1}`}>
            <p>{item}</p>
            <OutputActionRow>
              <CopyTextButton text={item} label="Copy sentence" />
            </OutputActionRow>
          </OutputCard>
        ))}
      </div>
    </div>
  );
}

export default function GrammarPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <GrammarPageContent />
    </Suspense>
  );
}
