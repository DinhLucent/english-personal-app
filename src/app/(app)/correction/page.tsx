"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { AlertTriangle, Loader2, PenLine, RefreshCw, RotateCcw, Clock, Sparkles } from "lucide-react";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import { CopyTextButton, OutputActionButton, OutputActionRow } from "@/components/output-actions";
import {
  Badge,
  Button,
  EmptyState,
  FieldLabel,
  LiveRegion,
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
import type { CorrectionResult } from "@/lib/ai/schemas";
import type { CorrectionHistoryItem, HistoryEnvelope } from "@/lib/history";
import { emitLearningEvent } from "@/lib/learning-events";
import { playSoundCue } from "@/lib/sound";

function CorrectionPageContent() {
  const [text, setText] = useState("I am responsible to build feature and fix bug for my team.");
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [history, setHistory] = useState<HistoryEnvelope<CorrectionHistoryItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useNaturalMessage, setUseNaturalMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getJson<HistoryEnvelope<CorrectionHistoryItem>>(
        "/api/history?type=corrections&limit=8",
      );
      setHistory(response);
    } catch (err) {
      setHistory({
        items: [],
        source: "empty",
        reason: err instanceof Error ? err.message : "Could not load correction history.",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialHistory() {
      try {
        const response = await getJson<HistoryEnvelope<CorrectionHistoryItem>>(
          "/api/history?type=corrections&limit=8",
        );
        if (active) setHistory(response);
      } catch (err) {
        if (!active) return;
        setHistory({
          items: [],
          source: "empty",
          reason: err instanceof Error ? err.message : "Could not load correction history.",
        });
      }
    }

    void loadInitialHistory();

    return () => {
      active = false;
    };
  }, []);

  function applyNaturalText(value: string) {
    setText(value);
    setUseNaturalMessage("Natural version loaded to editor.");
    changeTab("editor");
    emitLearningEvent({
      kind: "review",
      target: "correction-use-natural",
      cue: "review-saved",
      intensity: "micro",
    });
    window.setTimeout(() => {
      document.getElementById("correction-text")?.focus();
    }, 100);
    window.setTimeout(() => setUseNaturalMessage(null), 1800);
  }

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const response = await postJson<CorrectionResult>("/api/ai/correction", { text });
      setResult(response.data);
      await loadHistory();
      changeTab("result");
      void playSoundCue("feedback-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correction failed.");
      changeTab("editor");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  const tabItems = [
    { id: "editor", label: "Editor", icon: <PenLine size={16} /> },
    { id: "result", label: "Result", icon: <Sparkles size={16} /> },
    { id: "mistakes", label: "Mistakes", icon: <AlertTriangle size={16} /> },
    { id: "history", label: "History", icon: <Clock size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("editor", ["editor", "result", "mistakes", "history"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Correction"
        title="Fix English with clear Vietnamese explanations"
        description="Paste a sentence or paragraph. The agent returns mistakes, a correct version, a natural version, and a score."
        action={
          <Button
            onClick={submit}
            disabled={loading || text.trim().length < 2}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <PenLine size={18} />}
          >
            {loading ? "Checking" : "Correct"}
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "editor" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-editor" aria-labelledby="tab-editor">
          <Panel>
            <div className="space-y-2">
              <FieldLabel htmlFor="correction-text">Text to correct</FieldLabel>
              <Textarea
                id="correction-text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={3000}
                aria-describedby="correction-count"
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <span id="correction-count">{text.length}/3000 characters</span>
              <Badge tone={text.trim().length > 1 ? "brand" : "neutral"}>
                {text.trim().length > 1 ? "Ready" : "Needs text"}
              </Badge>
            </div>
            {error ? (
              <StateNotice
                className="mt-4"
                role="alert"
                tone="danger"
                title="Correction failed"
                description={error}
              />
            ) : null}
          </Panel>
        </div>
      )}

      {activeTab === "result" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-result" aria-labelledby="tab-result">
          {loading ? (
            <Panel>
              <LoadingState
                title="Checking your English"
                description="Finding mistakes, natural phrasing, and a practical explanation."
                rows={4}
              />
            </Panel>
          ) : result ? (
            <Panel>
              <div className="space-y-5">
                <ResultHeader
                  eyebrow="Correction result"
                  title="Feedback ready"
                  description="Compare the correct version, the natural version, and the specific fixes to practice next."
                  badges={<Badge tone="brand">Score {result.score}</Badge>}
                  metric={{
                    label: "Score",
                    value: String(result.score),
                    detail: result.score >= 80 ? "strong draft" : "needs polish",
                    tone: result.score >= 80 ? "brand" : "amber",
                  }}
                />
                <OutputActionRow>
                  <CopyTextButton text={formatCorrectionCopy(result)} label="Copy feedback" tone="brand" />
                  <OutputActionButton
                    label={useNaturalMessage ? "Loaded" : "Use natural"}
                    icon={RotateCcw}
                    tone="blue"
                    onClick={() => applyNaturalText(result.natural)}
                  />
                </OutputActionRow>
                <LiveRegion message={useNaturalMessage} />
                <div className="grid gap-3 md:grid-cols-2">
                  <ResultSection title="Correct version" text={result.corrected} tone="brand" />
                  <ResultSection title="Natural version" text={result.natural} tone="blue" />
                </div>
              </div>
            </Panel>
          ) : (
            <EmptyState
              tone="info"
              icon={<PenLine size={18} />}
              title="No correction yet"
              description="Run the agent once. Each result will also be stored in correction history when storage is available."
              action={
                <Button variant="secondary" onClick={submit} disabled={loading || text.trim().length < 2} icon={<PenLine size={16} />}>
                  Correct text
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === "mistakes" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-mistakes" aria-labelledby="tab-mistakes">
          {result ? (
            <Panel>
              <div>
                <SectionHeading
                  title="Mistakes"
                  description="Each item shows the phrase, issue, fix, and Vietnamese reason."
                  action={<Badge tone="coral">{result.mistakes.length} fix(es)</Badge>}
                />
                <div className="mt-3 grid gap-3">
                  {result.mistakes.map((mistake) => (
                    <OutputCard
                      key={`${mistake.text}-${mistake.fix}`}
                      title={mistake.text}
                      description={mistake.issue}
                      tone="coral"
                    >
                      <p className="font-medium text-foreground">Use: {mistake.fix}</p>
                      <p className="mt-2 text-muted">{mistake.explanationVi}</p>
                      <OutputActionRow>
                        <CopyTextButton text={`${mistake.text} -> ${mistake.fix}`} label="Copy fix" tone="coral" />
                      </OutputActionRow>
                    </OutputCard>
                  ))}
                </div>
              </div>
            </Panel>
          ) : (
            <EmptyState
              tone="info"
              icon={<AlertTriangle size={18} />}
              title="No mistakes analyzed yet"
              description="Run correction to see a list of grammatical or stylistic issues identified."
            />
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
          <Panel>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Correction history</h2>
                <p className="mt-1 text-sm text-muted">Recent saved corrections from Supabase.</p>
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
              <LoadingState title="Loading correction history" description="Checking saved correction results." rows={3} />
            ) : history?.items.length ? (
              <div className="grid gap-3">
                {history.items.map((item) => (
                  <OutputCard
                    key={item.id}
                    title={item.naturalText}
                    description={item.originalText}
                    badge={<Badge tone="brand">Score {item.score ?? "--"}</Badge>}
                  >
                    <p className="border-t border-line/30 pt-2 text-xs text-muted-soft">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                    <OutputActionRow>
                      <CopyTextButton text={item.naturalText} label="Copy natural" />
                    </OutputActionRow>
                  </OutputCard>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved corrections"
                description={history?.reason ?? "Run a correction to populate history."}
                action={
                  <Button variant="secondary" onClick={submit} disabled={loading || text.trim().length < 2} icon={<PenLine size={16} />}>
                    Run correction
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

function ResultSection({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone: "brand" | "blue";
}) {
  return (
    <OutputCard title={title} tone={tone}>
      <p>{text}</p>
      <OutputActionRow>
        <CopyTextButton text={text} label="Copy text" tone={tone} />
      </OutputActionRow>
    </OutputCard>
  );
}

function formatCorrectionCopy(result: CorrectionResult) {
  return [
    `Score: ${result.score}`,
    "",
    `Correct: ${result.corrected}`,
    `Natural: ${result.natural}`,
    "",
    "Mistakes:",
    ...result.mistakes.map((mistake) => `- ${mistake.text} -> ${mistake.fix}: ${mistake.issue}`),
  ].join("\n");
}

export default function CorrectionPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <CorrectionPageContent />
    </Suspense>
  );
}
