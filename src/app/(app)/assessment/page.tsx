"use client";

import { useCallback, useEffect, useId, useState, Suspense } from "react";
import { Mic, Loader2, RefreshCw, Target, PenLine, BarChart3, Sparkles, Clock } from "lucide-react";
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
  SectionHeading,
  StateNotice,
  Textarea,
} from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { AssessmentResult } from "@/lib/ai/schemas";
import type { AssessmentHistoryItem, HistoryEnvelope } from "@/lib/history";
import { playSoundCue } from "@/lib/sound";

function AssessmentPageContent() {
  const [vocabularyAnswers, setVocabularyAnswers] = useState("deadline, priority, meeting, clarify, deliver");
  const [grammarAnswers, setGrammarAnswers] = useState("I work every day. Yesterday I fixed a bug. I have finished the task.");
  const [communicationAnswers, setCommunicationAnswers] = useState("I would ask: Could you clarify the requirement?");
  const [writingSample, setWritingSample] = useState("Today I am working on a new feature. I need to finish it before Friday.");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [history, setHistory] = useState<HistoryEnvelope<AssessmentHistoryItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getJson<HistoryEnvelope<AssessmentHistoryItem>>(
        "/api/history?type=assessments&limit=6",
      );
      setHistory(response);
    } catch (err) {
      setHistory({
        items: [],
        source: "empty",
        reason: err instanceof Error ? err.message : "Could not load assessment history.",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialHistory() {
      try {
        const response = await getJson<HistoryEnvelope<AssessmentHistoryItem>>(
          "/api/history?type=assessments&limit=6",
        );
        if (active) setHistory(response);
      } catch (err) {
        if (!active) return;
        setHistory({
          items: [],
          source: "empty",
          reason: err instanceof Error ? err.message : "Could not load assessment history.",
        });
      }
    }

    void loadInitialHistory();

    return () => {
      active = false;
    };
  }, []);

  async function assess() {
    setLoading(true);
    setError(null);
    try {
      const response = await postJson<AssessmentResult>("/api/ai/assessment", {
        vocabularyAnswers,
        grammarAnswers,
        communicationAnswers,
        writingSample,
      });
      setResult(response.data);
      await loadHistory();
      changeTab("scores");
      void playSoundCue("feedback-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed.");
      changeTab("input");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  const tabItems = [
    { id: "input", label: "Input", icon: <PenLine size={16} /> },
    { id: "scores", label: "Scores", icon: <BarChart3 size={16} /> },
    { id: "plan", label: "Plan", icon: <Sparkles size={16} /> },
    { id: "history", label: "History", icon: <Clock size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("input", ["input", "scores", "plan", "history"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment"
        title="Estimate level and get the next 7 days"
        description="Use short answers for vocabulary, grammar, communication, and writing. The agent returns A1-B2 and a plan."
        action={
          <Button
            onClick={assess}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Target size={18} />}
          >
            {loading ? "Assessing" : "Assess"}
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "input" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-input" aria-labelledby="tab-input">
          <Panel>
            <SectionHeading
              title="Assessment inputs"
              description="Short, honest answers work best. Keep each area focused so the level estimate can separate vocabulary, grammar, communication, and writing."
              action={
                <Button
                  variant="secondary"
                  onClick={assess}
                  disabled={loading}
                  icon={loading ? <Loader2 className="animate-spin" size={16} /> : <Target size={16} />}
                >
                  {loading ? "Assessing" : "Run assessment"}
                </Button>
              }
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <AssessmentField
                label="Vocabulary answers"
                description="List workplace words or phrases you already use."
                value={vocabularyAnswers}
                onChange={setVocabularyAnswers}
              />
              <AssessmentField
                label="Grammar answers"
                description="Write a few sentences across time or structure."
                value={grammarAnswers}
                onChange={setGrammarAnswers}
              />
              <AssessmentField
                label="Communication answers"
                description="Show how you would ask, clarify, or respond."
                value={communicationAnswers}
                onChange={setCommunicationAnswers}
              />
              <AssessmentField
                label="Writing sample"
                description="Use a short paragraph from your real work context."
                value={writingSample}
                onChange={setWritingSample}
              />
            </div>
            {error ? (
              <StateNotice
                className="mt-4"
                role="alert"
                tone="danger"
                title="Assessment failed"
                description={error}
              />
            ) : null}
          </Panel>
        </div>
      )}

      {activeTab === "scores" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-scores" aria-labelledby="tab-scores">
          {loading ? (
            <Panel>
              <LoadingState
                title="Estimating your level"
                description="Reading answers across vocabulary, grammar, communication, and writing before building a 7-day plan."
                rows={5}
              />
            </Panel>
          ) : result ? (
            <Panel>
              <AssessmentResultScoresView result={result} />
            </Panel>
          ) : (
            <EmptyState
              tone="info"
              icon={<Target size={18} />}
              title="No assessment yet"
              description="Run the assessment to estimate your level and generate a focused 7-day plan."
              action={
                <Button variant="secondary" onClick={assess} disabled={loading} icon={<Target size={16} />}>
                  Run assessment
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === "plan" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-plan" aria-labelledby="tab-plan">
          {result ? (
            <Panel>
              <AssessmentResultPlanView result={result} />
            </Panel>
          ) : (
            <EmptyState
              tone="info"
              icon={<Sparkles size={18} />}
              title="No practice plan yet"
              description="Your 7-day study plan will appear here after you run the assessment."
            />
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
          <Panel>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Assessment history</h2>
                <p className="mt-1 text-sm text-muted">Recent saved level checks.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => void loadHistory()}
                disabled={historyLoading}
                icon={historyLoading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              >
                Refresh
              </Button>
            </div>
            {historyLoading && !history ? (
              <LoadingState title="Loading level checks" description="Checking recent assessment history." rows={3} />
            ) : history?.items.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {history.items.map((item) => (
                  <OutputCard
                    key={item.id}
                    title={`Level ${item.level}`}
                    description={new Date(item.createdAt).toLocaleString()}
                    badge={<Badge tone="brand">{item.level}</Badge>}
                  >
                    <p className="font-semibold text-foreground">Strengths</p>
                    <p className="mt-1 text-muted">{item.strengths.join(", ") || "--"}</p>
                    <p className="mt-3 font-semibold text-foreground">Weaknesses</p>
                    <p className="mt-1 text-muted">{item.weaknesses.join(", ") || "--"}</p>
                  </OutputCard>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved assessments"
                description={history?.reason ?? "Run an assessment to save results."}
                action={
                  <Button variant="secondary" onClick={assess} disabled={loading} icon={<Target size={16} />}>
                    Run assessment
                  </Button>
                }
              />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <AssessmentPageContent />
    </Suspense>
  );
}

function AssessmentResultScoresView({ result }: { result: AssessmentResult }) {
  const scoreEntries = Object.entries(result.scores);
  const averageScore = Math.round(
    scoreEntries.reduce((total, [, value]) => total + value, 0) / Math.max(scoreEntries.length, 1),
  );

  return (
    <div className="space-y-5">
      <ResultHeader
        eyebrow="Level estimate"
        title={`Level ${result.level}`}
        description="Your scores are grouped by skill, then translated into a focused 7-day practice plan."
        badges={<Badge tone="brand">Plan ready</Badge>}
        metric={{
          label: "Average",
          value: String(averageScore),
          detail: "skill score",
          tone: "brand",
        }}
      />
      <OutputActionRow>
        <CopyTextButton text={formatAssessmentCopy(result, averageScore)} label="Copy plan" tone="brand" />
        <OutputActionLink href="/speaking" label="Practice next" icon={Mic} tone="blue" />
      </OutputActionRow>
      <div className="grid gap-3 md:grid-cols-2">
        {scoreEntries.map(([key, value]) => (
          <OutputCard
            key={key}
            title={formatSkillLabel(key)}
            eyebrow="Skill score"
            badge={<Badge tone="neutral">{value}/100</Badge>}
          >
            <div className="h-2 rounded-full bg-panel-muted">
              <div
                className={`h-full rounded-full ${getScoreBarClass(value)}`}
                style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
              />
            </div>
          </OutputCard>
        ))}
      </div>
    </div>
  );
}

function AssessmentResultPlanView({ result }: { result: AssessmentResult }) {
  return (
    <div className="space-y-5">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <PlanList title="Strengths" items={result.strengths} tone="brand" />
        <PlanList title="Weaknesses" items={result.weaknesses} tone="coral" />
      </div>
      <div>
        <SectionHeading
          title="Next 7 days"
          description="A compact sequence so the next action stays visible even when the plan is long."
        />
        <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {result.nextSevenDays.map((day) => (
            <OutputCard
              key={day.day}
              title={day.focus}
              description={day.task}
              eyebrow="Practice day"
              badge={<Badge tone="violet">Day {day.day}</Badge>}
              tone={day.day === 1 ? "blue" : "neutral"}
              className={`h-full ${day.day === result.nextSevenDays.length ? "lg:col-span-2 xl:col-span-3" : ""}`}
            >
              <OutputActionRow>
                <CopyTextButton text={`Day ${day.day}: ${day.focus}\n${day.task}`} label="Copy task" />
              </OutputActionRow>
            </OutputCard>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatSkillLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

function getScoreBarClass(value: number) {
  if (value >= 75) return "bg-brand";
  if (value >= 65) return "bg-warning";
  return "bg-coral";
}

function formatAssessmentCopy(result: AssessmentResult, averageScore: number) {
  return [
    `Level: ${result.level}`,
    `Average score: ${averageScore}`,
    "",
    "Scores:",
    ...Object.entries(result.scores).map(([key, value]) => `- ${formatSkillLabel(key)}: ${value}/100`),
    "",
    "Strengths:",
    ...result.strengths.map((item) => `- ${item}`),
    "",
    "Weaknesses:",
    ...result.weaknesses.map((item) => `- ${item}`),
    "",
    "Next 7 days:",
    ...result.nextSevenDays.map((day) => `Day ${day.day}: ${day.focus} - ${day.task}`),
  ].join("\n");
}

function AssessmentField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const fieldId = useId();
  const descriptionId = `${fieldId}-description`;
  const characterCount = value.length;

  return (
    <div className="rounded-card border border-line/70 bg-white/85 p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
          <p id={descriptionId} className="mt-1 text-sm leading-6 text-muted">
            {description}
          </p>
        </div>
        <Badge tone="neutral" className="self-start">{characterCount} chars</Badge>
      </div>
      <Textarea
        id={fieldId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={descriptionId}
        className="mt-3 block min-h-28 resize-none bg-white text-left align-top sm:min-h-32"
        style={{ resize: "none" }}
      />
    </div>
  );
}

function PlanList({ title, items, tone }: { title: string; items: string[]; tone: "brand" | "coral" }) {
  return (
    <div className="h-full rounded-card border border-line/60 bg-white/75 p-3.5">
      <SectionHeading
        title={title}
        description={tone === "brand" ? "Keep using these patterns." : "Turn these into short drills next."}
        action={<CopyTextButton text={items.join("\n")} label="Copy set" tone={tone} />}
      />
      <ul className="mt-3 grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="grid grid-cols-[auto_1fr] gap-2 rounded-card bg-panel-muted p-3">
            <Badge tone={tone}>{tone === "brand" ? "Strong" : "Focus"}</Badge>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
