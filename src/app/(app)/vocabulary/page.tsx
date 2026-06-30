"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { BookOpenCheck, CheckCircle2, Clock, Loader2, RefreshCw, Sparkles } from "lucide-react";
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
  TextInput,
} from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { VocabularyBatch } from "@/lib/ai/schemas";
import type { HistoryEnvelope, VocabularyHistoryItem } from "@/lib/history";
import { playSoundCue } from "@/lib/sound";

const generatorHighlights = [
  {
    title: "Role-fit words",
    description: "Terms are framed around your job role and meeting context.",
  },
  {
    title: "Vietnamese support",
    description: "Each word includes meaning, example, and usage note.",
  },
  {
    title: "Review-ready",
    description: "Generated items can move into saved review when storage is available.",
  },
];

const previewRows = [
  { badge: "Word", text: "deadline, clarify, align, blocker" },
  { badge: "Example", text: "I need to clarify the deadline before the meeting." },
  { badge: "Usage", text: "Short notes explain when the word sounds natural at work." },
];

function VocabularyPageContent() {
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
      changeTab("words");
      void playSoundCue("feedback-ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate vocabulary.");
      changeTab("generator");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  const tabItems = [
    { id: "generator", label: "Generator", icon: <Sparkles size={16} /> },
    { id: "words", label: "Words", icon: <BookOpenCheck size={16} /> },
    { id: "saved", label: "Saved", icon: <Clock size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("generator", ["generator", "words", "saved"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Vocabulary"
        title="Build vocabulary around your work"
        description="Generate words with Vietnamese meaning, examples, and usage notes. Saving and review scheduling use Supabase when available."
        action={
          <Button
            onClick={generate}
            disabled={loading}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
          >
            {loading ? "Generating" : "Generate"}
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "generator" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-generator" aria-labelledby="tab-generator">
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Panel>
              <SectionHeading
                title="Batch setup"
                description="Keep the inputs specific so the generated words are useful in your real conversations."
                action={
                  <Button
                    variant="secondary"
                    onClick={generate}
                    disabled={loading}
                    icon={loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                  >
                    {loading ? "Generating" : "Generate batch"}
                  </Button>
                }
              />
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel htmlFor="jobRole">Job role</FieldLabel>
                  <TextInput id="jobRole" value={jobRole} onChange={(event) => setJobRole(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <FieldLabel htmlFor="topic">Topic</FieldLabel>
                  <TextInput id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {generatorHighlights.map((item) => (
                  <div key={item.title} className="rounded-card border border-line/60 bg-white/80 p-3 text-sm leading-6">
                    <CheckCircle2 className="text-brand" size={16} />
                    <p className="mt-2 font-semibold">{item.title}</p>
                    <p className="mt-1 text-muted">{item.description}</p>
                  </div>
                ))}
              </div>
              {error ? (
                <StateNotice
                  className="mt-4"
                  role="alert"
                  tone="danger"
                  title="Vocabulary could not be generated"
                  description={error}
                />
              ) : null}
            </Panel>
            <Panel className="border-brand/20 bg-brand/[0.04]">
              <SectionHeading
                title="Batch preview"
                description="The Words tab will open with a compact practice set after generation."
              />
              <div className="mt-4 grid gap-3">
                {previewRows.map((row) => (
                  <div key={row.badge} className="rounded-card border border-brand/15 bg-white/90 p-3 text-sm leading-6">
                    <Badge tone="brand">{row.badge}</Badge>
                    <p className="mt-2 text-foreground">{row.text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-card border border-line/60 bg-white/80 p-3 text-sm leading-6 text-muted">
                Suggested current batch: <span className="font-semibold text-foreground">{jobRole}</span> / {topic}
              </p>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "words" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-words" aria-labelledby="tab-words">
          {loading ? (
            <Panel>
              <LoadingState
                title="Generating vocabulary batch"
                description="Collecting practical words, Vietnamese meanings, examples, and usage notes for review."
                rows={4}
              />
            </Panel>
          ) : batch ? (
            <Panel>
              <div>
                <ResultHeader
                  eyebrow="Generated batch"
                  title={batch.topic}
                  description="Fresh words ready for practice and review."
                  badges={<Badge tone="brand">{batch.items.length} item(s)</Badge>}
                  metric={{
                    label: "Batch",
                    value: String(batch.items.length),
                    detail: "review words",
                    tone: "brand",
                  }}
                />
                <OutputActionRow>
                  <CopyTextButton text={formatVocabularyBatchCopy(batch)} label="Copy batch" tone="brand" />
                  <OutputActionLink href="/review" label="Review saved" icon={BookOpenCheck} tone="violet" />
                </OutputActionRow>
                <SectionHeading
                  className="mt-5"
                  title="Words to practice"
                  description="Each card keeps the word, meaning, example, and usage note in one scan path."
                />
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {batch.items.map((item) => (
                    <OutputCard
                      key={item.word}
                      title={item.word}
                      description={item.meaningVi}
                      badge={<Badge tone="blue">{batch.topic}</Badge>}
                    >
                      <p className="font-medium text-foreground">{item.example}</p>
                      <p className="mt-3 border-t border-line/30 pt-2 text-xs leading-5 text-muted-soft">
                        {item.usageNoteVi}
                      </p>
                      <OutputActionRow>
                        <CopyTextButton text={formatVocabularyItemCopy(item, batch.topic)} label="Copy word" />
                      </OutputActionRow>
                    </OutputCard>
                  ))}
                </div>
              </div>
            </Panel>
          ) : (
            <EmptyState
              tone="info"
              icon={<Sparkles size={18} />}
              title="No vocabulary yet"
              description="Generate a focused batch, then connect Supabase to save words and review dates."
              action={
                <Button variant="secondary" onClick={generate} disabled={loading} icon={<Sparkles size={16} />}>
                  Generate batch
                </Button>
              }
            />
          )}
        </div>
      )}

      {activeTab === "saved" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-saved" aria-labelledby="tab-saved">
          <Panel>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Saved vocabulary</h2>
                <p className="mt-1 text-sm text-muted">Recent words saved for review.</p>
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
              <LoadingState title="Loading saved words" description="Checking recent vocabulary review items." rows={3} />
            ) : history?.items.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {history.items.map((item) => (
                  <OutputCard
                    key={item.id}
                    title={item.word}
                    description={item.meaningVi}
                    badge={<Badge tone="neutral">{item.topic ?? "General"}</Badge>}
                  >
                    <p className="font-medium text-foreground">{item.example}</p>
                    <p className="mt-3 border-t border-line/30 pt-2 text-xs text-muted-soft">
                      Reviews: {item.reviewCount} / Next: {item.nextReviewAt ? new Date(item.nextReviewAt).toLocaleDateString() : "--"}
                    </p>
                    <OutputActionRow>
                      <CopyTextButton
                        text={`${item.word} (${item.topic ?? "General"}): ${item.example}`}
                        label="Copy example"
                      />
                    </OutputActionRow>
                  </OutputCard>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved vocabulary"
                description={history?.reason ?? "Generate vocabulary to save words."}
                action={
                  <Button variant="secondary" onClick={generate} disabled={loading} icon={<Sparkles size={16} />}>
                    Generate words
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

export default function VocabularyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <VocabularyPageContent />
    </Suspense>
  );
}

function formatVocabularyItemCopy(item: VocabularyBatch["items"][number], topic: string) {
  return [
    `${item.word} (${topic})`,
    item.meaningVi,
    item.example,
    item.usageNoteVi,
  ].join("\n");
}

function formatVocabularyBatchCopy(batch: VocabularyBatch) {
  return [
    `Vocabulary: ${batch.topic}`,
    ...batch.items.map((item) => `- ${item.word}: ${item.meaningVi}. ${item.example}`),
  ].join("\n");
}
