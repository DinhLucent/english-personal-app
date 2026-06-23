"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Target } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, Panel, Textarea } from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { AssessmentResult } from "@/lib/ai/schemas";
import type { AssessmentHistoryItem, HistoryEnvelope } from "@/lib/history";

export default function AssessmentPage() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assessment"
        title="Estimate level and get the next 7 days"
        description="Use short answers for vocabulary, grammar, communication, and writing. The agent returns A1-B2 and a plan."
        action={
          <Button onClick={assess} disabled={loading} icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Target size={18} />}>
            Assess
          </Button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <AssessmentField label="Vocabulary answers" value={vocabularyAnswers} onChange={setVocabularyAnswers} />
          <AssessmentField label="Grammar answers" value={grammarAnswers} onChange={setGrammarAnswers} />
          <AssessmentField label="Communication answers" value={communicationAnswers} onChange={setCommunicationAnswers} />
          <AssessmentField label="Writing sample" value={writingSample} onChange={setWritingSample} />
          {error ? <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm text-[#7b3f34]">{error}</div> : null}
        </Panel>
        <Panel>
          {result ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#66716c]">Estimated level</p>
                <p className="mt-1 text-4xl font-semibold text-brand">{result.level}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(result.scores).map(([key, value]) => (
                  <div key={key} className="rounded-[8px] border border-line p-4">
                    <p className="text-sm font-semibold capitalize">{key}</p>
                    <p className="mt-2 text-2xl font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <PlanList title="Strengths" items={result.strengths} />
              <PlanList title="Weaknesses" items={result.weaknesses} />
              <div>
                <h3 className="font-semibold">Next 7 days</h3>
                <div className="mt-3 grid gap-3">
                  {result.nextSevenDays.map((day) => (
                    <div key={day.day} className="rounded-[8px] border border-line p-4 text-sm leading-6">
                      <p className="font-semibold">Day {day.day}: {day.focus}</p>
                      <p className="mt-1 text-[#66716c]">{day.task}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState title="No assessment yet" description="Run the assessment when DeepSeek is connected. Results will be saved to assessment history." />
          )}
        </Panel>
      </div>
      <Panel>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Assessment history</h2>
            <p className="mt-1 text-sm text-[#66716c]">Recent saved level checks.</p>
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
        {history?.items.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {history.items.map((item) => (
              <div key={item.id} className="rounded-[8px] border border-line p-4 text-sm leading-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-2xl font-semibold text-brand">{item.level}</p>
                  <p className="text-xs text-[#66716c]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-3 font-semibold">Strengths</p>
                <p className="mt-1 text-[#66716c]">{item.strengths.join(", ") || "--"}</p>
                <p className="mt-3 font-semibold">Weaknesses</p>
                <p className="mt-1 text-[#66716c]">{item.weaknesses.join(", ") || "--"}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved assessments"
            description={history?.reason ?? "Run an assessment to save results."}
          />
        )}
      </Panel>
    </div>
  );
}

function AssessmentField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-24" />
    </div>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm">
        {items.map((item) => (
          <li key={item} className="rounded-[8px] bg-panel-muted p-3">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
