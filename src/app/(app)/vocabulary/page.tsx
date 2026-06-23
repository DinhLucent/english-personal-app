"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button, EmptyState, FieldLabel, PageHeader, Panel, TextInput } from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { VocabularyBatch } from "@/lib/ai/schemas";
import type { HistoryEnvelope, VocabularyHistoryItem } from "@/lib/history";

export default function VocabularyPage() {
  const [jobRole, setJobRole] = useState("founder");
  const [topic, setTopic] = useState("meetings");
  const [batch, setBatch] = useState<VocabularyBatch | null>(null);
  const [history, setHistory] = useState<HistoryEnvelope<VocabularyHistoryItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getJson<HistoryEnvelope<VocabularyHistoryItem>>(
        "/api/history?type=vocabulary&limit=12",
      );
      setHistory(response);
    } catch (err) {
      setHistory({
        items: [],
        source: "empty",
        reason: err instanceof Error ? err.message : "Could not load vocabulary history.",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialHistory() {
      try {
        const response = await getJson<HistoryEnvelope<VocabularyHistoryItem>>(
          "/api/history?type=vocabulary&limit=12",
        );
        if (active) setHistory(response);
      } catch (err) {
        if (!active) return;
        setHistory({
          items: [],
          source: "empty",
          reason: err instanceof Error ? err.message : "Could not load vocabulary history.",
        });
      }
    }

    void loadInitialHistory();

    return () => {
      active = false;
    };
  }, []);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await postJson<VocabularyBatch>("/api/ai/vocabulary", { jobRole, topic });
      setBatch(response.data);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate vocabulary.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vocabulary"
        title="Build vocabulary around your work"
        description="Generate words with Vietnamese meaning, examples, and usage notes. Saving/review scheduling will use Supabase."
        action={
          <Button
            onClick={generate}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          >
            Generate
          </Button>
        }
      />
      <Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="jobRole">Job role</FieldLabel>
            <TextInput id="jobRole" value={jobRole} onChange={(event) => setJobRole(event.target.value)} />
          </div>
          <div className="space-y-2">
            <FieldLabel htmlFor="topic">Topic</FieldLabel>
            <TextInput id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
          </div>
        </div>
        {error ? <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm text-[#7b3f34]">{error}</div> : null}
      </Panel>
      <Panel>
        {batch ? (
          <div>
            <h2 className="text-lg font-semibold">{batch.topic}</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {batch.items.map((item) => (
                <div key={item.word} className="rounded-[8px] border border-line/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-brand hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:translate-y-[-1px]">
                  <p className="font-semibold">{item.word}</p>
                  <p className="mt-1 text-sm text-[#66716c]">{item.meaningVi}</p>
                  <p className="mt-3 text-sm font-medium">{item.example}</p>
                  <p className="mt-3 text-xs leading-5 text-[#8b9691] border-t border-line/30 pt-2">{item.usageNoteVi}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No vocabulary yet" description="Generate a batch, then connect Supabase to save words and review dates." />
        )}
      </Panel>
      <Panel>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Saved vocabulary</h2>
            <p className="mt-1 text-sm text-[#66716c]">Recent words saved for review.</p>
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
              <div key={item.id} className="rounded-[8px] border border-line/60 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300 hover:border-brand hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:translate-y-[-1px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.word}</p>
                  <span className="rounded-full bg-panel-muted px-3 py-1 text-xs font-semibold text-brand-strong">
                    {item.topic ?? "General"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#66716c]">{item.meaningVi}</p>
                <p className="mt-3 text-sm font-medium">{item.example}</p>
                <p className="mt-3 text-xs text-[#8b9691] border-t border-line/30 pt-2">
                  Reviews: {item.reviewCount} · Next:{" "}
                  {item.nextReviewAt ? new Date(item.nextReviewAt).toLocaleDateString() : "--"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved vocabulary"
            description={history?.reason ?? "Generate vocabulary to save words."}
          />
        )}
      </Panel>
    </div>
  );
}
