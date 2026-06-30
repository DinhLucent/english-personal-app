"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { Loader2, MessageSquare, RefreshCw, Square, Clock, PenLine, Sparkles } from "lucide-react";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import {
  Badge,
  Button,
  EmptyState,
  LoadingState,
  PageHeader,
  Panel,
  Select,
  StateNotice,
  TextInput,
} from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { ConversationReply, ConversationSummary } from "@/lib/ai/schemas";
import { fireConfetti } from "@/lib/confetti";
import type { HistoryEnvelope, SessionHistoryItem } from "@/lib/history";
import { emitLearningEvent } from "@/lib/learning-events";
import { playSoundCue } from "@/lib/sound";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function focusElementSoon(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 0);
}

function ConversationPageContent() {
  const [difficulty, setDifficulty] = useState<"Easy" | "Normal" | "Hard">("Normal");
  const [answer, setAnswer] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [lastFeedback, setLastFeedback] = useState<ConversationReply | null>(null);
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [history, setHistory] = useState<HistoryEnvelope<SessionHistoryItem> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await getJson<HistoryEnvelope<SessionHistoryItem>>(
        "/api/history?type=sessions&limit=8",
      );
      setHistory(response);
    } catch (err) {
      setHistory({
        items: [],
        source: "empty",
        reason: err instanceof Error ? err.message : "Could not load session history.",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialHistory() {
      try {
        const response = await getJson<HistoryEnvelope<SessionHistoryItem>>(
          "/api/history?type=sessions&limit=8",
        );
        if (active) setHistory(response);
      } catch (err) {
        if (!active) return;
        setHistory({
          items: [],
          source: "empty",
          reason: err instanceof Error ? err.message : "Could not load session history.",
        });
      }
    }

    void loadInitialHistory();

    return () => {
      active = false;
    };
  }, []);

  async function sendAnswer(initial = false) {
    emitLearningEvent({
      kind: initial ? "start" : "send",
      target: initial ? "#conversation-start-action" : "#conversation-send-action",
      cue: initial ? "start" : "send",
      intensity: "micro",
    });
    setLoading(true);
    setError(null);
    setSummary(null);
    const nextMessages = initial
      ? messages
      : [...messages, { role: "user" as const, content: answer }];

    try {
      const response = await postJson<ConversationReply>("/api/ai/conversation", {
        mode: "reply",
        difficulty,
        messages: nextMessages,
      });
      const assistantMessage = response.data.nextQuestion || response.data.reply;
      setMessages([...nextMessages, { role: "assistant", content: assistantMessage }]);
      setLastFeedback(response.data);
      setAnswer("");
      focusElementSoon("conversation-answer");
      emitLearningEvent({
        kind: "feedback",
        target: "#conversation-feedback-panel",
        cue: "feedback-ready",
        delayMs: 80,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversation failed.");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  async function stopAndSummarize() {
    setLoading(true);
    setError(null);

    try {
      const response = await postJson<ConversationSummary>("/api/ai/conversation", {
        mode: "summary",
        difficulty,
        messages,
      });
      setSummary(response.data);
      await loadHistory();
      localStorage.setItem("speakflow:conversation-completed", "true");
      window.dispatchEvent(new Event("speakflow:progress-update"));
      changeTab("summary");
      emitLearningEvent({
        kind: "complete",
        target: "#conversation-summary-panel",
        cue: "complete",
        intensity: "strong",
        delayMs: 80,
      });
      fireConfetti({ soundCue: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not summarize.");
      void playSoundCue("error");
    } finally {
      setLoading(false);
    }
  }

  const tabItems = [
    { id: "chat", label: "Chat", icon: <MessageSquare size={16} /> },
    { id: "feedback", label: "Feedback", icon: <PenLine size={16} /> },
    { id: "summary", label: "Summary", icon: <Sparkles size={16} /> },
    { id: "history", label: "History", icon: <Clock size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("chat", ["chat", "feedback", "summary", "history"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conversation"
        title="Practice one turn at a time"
        description="The agent corrects your latest answer, suggests a natural answer, then asks the next short question."
        action={
          <Button
            id="conversation-start-action"
            onClick={() => sendAnswer(messages.length === 0)}
            disabled={loading || (messages.length > 0 && answer.trim().length < 1)}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} />}
          >
            {messages.length === 0 ? (loading ? "Starting" : "Start") : loading ? "Sending" : "Send"}
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "chat" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-chat" aria-labelledby="tab-chat">
          <Panel>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-2 md:w-56">
                <label className="text-sm font-semibold" htmlFor="difficulty">
                  Difficulty
                </label>
                <Select
                  id="difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as "Easy" | "Normal" | "Hard")}
                >
                  <option>Easy</option>
                  <option>Normal</option>
                  <option>Hard</option>
                </Select>
              </div>
              <Button
                variant="secondary"
                onClick={stopAndSummarize}
                disabled={loading || messages.length === 0}
                icon={loading && messages.length > 0 ? <Loader2 className="animate-spin" size={16} /> : <Square size={16} />}
              >
                Stop & Summary
              </Button>
            </div>

            <div
              className={`grid gap-3 rounded-card border border-line bg-white p-4 ${messages.length > 0 || loading ? "min-h-80" : ""}`}
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Conversation messages"
            >
              {messages.length === 0 && loading ? (
                <LoadingState
                  title="Starting conversation"
                  description="Preparing the first short question for your selected difficulty."
                  rows={2}
                />
              ) : messages.length === 0 ? (
                <ConversationStartState
                  difficulty={difficulty}
                  loading={loading}
                  onStart={() => sendAnswer(true)}
                />
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    data-motion="message"
                    className={`max-w-[86%] rounded-card px-4 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-auto bg-gradient-to-r from-brand to-brand-strong text-white shadow-sm"
                        : "mr-auto border border-line/40 bg-panel-muted text-foreground"
                    }`}
                  >
                    {message.content}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <label className="sr-only" htmlFor="conversation-answer">Conversation answer</label>
              <TextInput
                id="conversation-answer"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer..."
                aria-describedby="conversation-answer-status"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !loading && answer.trim()) {
                    event.preventDefault();
                    void sendAnswer(false);
                  }
                }}
              />
              <Button
                id="conversation-send-action"
                onClick={() => sendAnswer(false)}
                disabled={loading || answer.trim().length < 1 || messages.length === 0}
              >
                Send
              </Button>
            </div>
            <p id="conversation-answer-status" className="sr-only">
              {messages.length === 0
                ? "Start the conversation before sending an answer."
                : loading
                  ? "Conversation answer is being sent."
                  : "Type an answer, then press Enter or Send."}
            </p>
            {error ? (
              <StateNotice
                className="mt-4"
                role="alert"
                tone="danger"
                title="Conversation request failed"
                description={error}
              />
            ) : null}
          </Panel>
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-feedback" aria-labelledby="tab-feedback">
          <Panel>
            <div id="conversation-feedback-panel" className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Latest feedback</h2>
              {lastFeedback ? <Badge tone="brand">Score {lastFeedback.score}</Badge> : null}
            </div>
            {loading && messages.length > 0 && !summary ? (
              <LoadingState
                className="mt-4"
                title="Reading your answer"
                description="Checking correction, natural phrasing, and the next prompt."
                rows={2}
              />
            ) : lastFeedback ? (
              <div data-motion="score" className="mt-4 space-y-4 text-sm leading-6">
                <p><span className="font-semibold">Correction:</span> {lastFeedback.correction}</p>
                <p><span className="font-semibold">Natural:</span> {lastFeedback.naturalAnswer}</p>
              </div>
            ) : (
              <EmptyState
                className="mt-4"
                title="Feedback waits for your first answer"
                description="Start the conversation and send one answer to reveal correction and natural phrasing."
              />
            )}
          </Panel>
        </div>
      )}

      {activeTab === "summary" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-summary" aria-labelledby="tab-summary">
          <Panel>
            <h2 id="conversation-summary-panel" className="font-semibold">Summary</h2>
            {summary ? (
              <div data-motion="completion" className="mt-4 space-y-4 text-sm leading-6">
                <p>{summary.summaryVi}</p>
                <p><span className="font-semibold">Next:</span> {summary.suggestedNextPractice}</p>
                <Badge tone="brand">Score {summary.score}</Badge>
              </div>
            ) : (
              <EmptyState
                className="mt-4"
                title="No session summary yet"
                description="Use Stop & Summary after a short session to save progress and next practice."
              />
            )}
          </Panel>
        </div>
      )}

      {activeTab === "history" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Recent sessions</h2>
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
              <LoadingState title="Loading sessions" description="Checking recent conversation summaries." rows={3} />
            ) : history?.items.length ? (
              <div className="grid gap-3">
                {history.items.map((item) => (
                  <div key={item.id} className="rounded-card border border-line p-4 text-sm leading-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold capitalize">{item.type}</p>
                      <p className="text-xs text-muted-soft">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 text-muted">
                      Score {item.score ?? "--"} / {item.minutesSpent} min / {item.difficulty ?? "Normal"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No saved sessions"
                description={history?.reason ?? "Saved conversation summaries will appear here."}
              />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function ConversationStartState({
  difficulty,
  loading,
  onStart,
}: {
  difficulty: "Easy" | "Normal" | "Hard";
  loading: boolean;
  onStart: () => void;
}) {
  const sessionShape = [
    {
      label: "First turn",
      description: "The coach asks one short workplace question.",
      icon: MessageSquare,
    },
    {
      label: "Feedback",
      description: "Correction and natural phrasing stay in the Feedback tab.",
      icon: PenLine,
    },
    {
      label: "Summary",
      description: "Stop after a few turns to save score and next practice.",
      icon: Sparkles,
    },
  ];

  return (
    <div data-motion="message" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="rounded-card border border-blue/20 bg-blue/5 p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex size-10 items-center justify-center rounded-control bg-blue/10 text-blue">
            <MessageSquare size={18} />
          </span>
          <Badge tone="blue">{difficulty} mode</Badge>
        </div>
        <h2 className="mt-4 text-xl font-semibold">Start with one answer</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Keep the reply short. The coach will correct the latest answer, suggest a natural version, then ask the next question.
        </p>
        <Button
          className="mt-5"
          variant="secondary"
          onClick={onStart}
          disabled={loading}
          icon={loading ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
        >
          Start now
        </Button>
        <div className="mt-5 rounded-card border border-blue/15 bg-white/75 p-3 text-sm leading-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-soft">Starter cue</p>
          <p className="mt-2 font-semibold text-foreground">
            I usually start my workday by checking the most urgent task first.
          </p>
          <p className="mt-1 text-muted">
            Swap in one detail from your day, then send it as your first answer.
          </p>
        </div>
      </div>

      <div className="rounded-card border border-line/70 bg-white/80 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-soft">Session shape</p>
        <div className="mt-3 grid gap-2">
          {sessionShape.map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className="grid grid-cols-[auto_1fr] gap-3 rounded-card border border-line/60 bg-panel-muted p-3">
                <span className="flex size-8 items-center justify-center rounded-control bg-white text-brand">
                  <Icon size={15} />
                </span>
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted">{item.description}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function ConversationPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <ConversationPageContent />
    </Suspense>
  );
}
