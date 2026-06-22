"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PenLine, RefreshCw } from "lucide-react";
import { Button, EmptyState, PageHeader, Panel, Textarea } from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { CorrectionResult } from "@/lib/ai/schemas";
import type { CorrectionHistoryItem, HistoryEnvelope } from "@/lib/history";

export default function CorrectionPage() {
  const [text, setText] = useState("I am responsible to build feature and fix bug for my team.");
  const [result, setResult] = useState<CorrectionResult | null>(null);
  const [history, setHistory] = useState<HistoryEnvelope<CorrectionHistoryItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  async function submit() {
    setLoading(true);
    setError(null);

    try {
      const response = await postJson<CorrectionResult>("/api/ai/correction", { text });
      setResult(response.data);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Correction failed.");
    } finally {
      setLoading(false);
    }
  }

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
            Correct
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <Textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={3000} />
          <p className="mt-3 text-sm text-[#66716c]">{text.length}/3000 characters</p>
          {error ? (
            <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm leading-6 text-[#7b3f34]">
              {error}
            </div>
          ) : null}
        </Panel>

        <Panel>
          {result ? (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-[#66716c]">Score</p>
                <p className="mt-1 text-3xl font-semibold text-brand">{result.score}</p>
              </div>
              <ResultSection title="Correct version" text={result.corrected} />
              <ResultSection title="Natural version" text={result.natural} />
              <div>
                <h3 className="font-semibold">Mistakes</h3>
                <div className="mt-3 grid gap-3">
                  {result.mistakes.map((mistake) => (
                    <div key={`${mistake.text}-${mistake.fix}`} className="rounded-[8px] border border-line p-4 text-sm leading-6">
                      <p className="font-semibold">{mistake.text}</p>
                      <p className="mt-1 text-[#66716c]">{mistake.issue}</p>
                      <p className="mt-2">Fix: {mistake.fix}</p>
                      <p className="mt-2 text-[#66716c]">{mistake.explanationVi}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No correction yet"
              description="Run the agent once. When Supabase is connected, each result will also be stored in correction history."
            />
          )}
        </Panel>
      </div>

      <Panel>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Correction history</h2>
            <p className="mt-1 text-sm text-[#66716c]">
              Recent saved corrections from Supabase.
            </p>
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
          <div className="grid gap-3">
            {history.items.map((item) => (
              <div key={item.id} className="rounded-[8px] border border-line p-4 text-sm leading-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Score {item.score ?? "--"}</p>
                  <p className="text-xs text-[#66716c]">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-[#66716c]">{item.originalText}</p>
                <p className="mt-2">{item.naturalText}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved corrections"
            description={history?.reason ?? "Sign in with Supabase and run a correction to populate history."}
          />
        )}
      </Panel>
    </div>
  );
}

function ResultSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 rounded-[8px] bg-panel-muted p-4 text-sm leading-6">{text}</p>
    </div>
  );
}
