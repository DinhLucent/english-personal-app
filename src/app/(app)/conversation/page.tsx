"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare, RefreshCw, Square } from "lucide-react";
import { Button, EmptyState, PageHeader, Panel, Select, TextInput } from "@/components/ui";
import { getJson, postJson } from "@/lib/client-api";
import type { ConversationReply, ConversationSummary } from "@/lib/ai/schemas";
import type { HistoryEnvelope, SessionHistoryItem } from "@/lib/history";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ConversationPage() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversation failed.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not summarize.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conversation"
        title="Practice one turn at a time"
        description="The agent corrects your latest answer, suggests a natural answer, then asks the next short question."
        action={
          <Button
            onClick={() => sendAnswer(messages.length === 0)}
            disabled={loading || (messages.length > 0 && answer.trim().length < 1)}
            icon={loading ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} />}
          >
            {messages.length === 0 ? "Start" : "Send"}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
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
              icon={<Square size={16} />}
            >
              Stop & Summary
            </Button>
          </div>

          <div className="grid min-h-80 gap-3 rounded-[8px] border border-line bg-white p-4">
            {messages.length === 0 ? (
              <EmptyState
                title="No conversation started"
                description="Click Start. The first assistant message will ask a short question."
              />
            ) : (
              messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[86%] rounded-[8px] px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-brand text-white"
                      : "mr-auto bg-panel-muted text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <TextInput
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loading && answer.trim()) {
                  void sendAnswer(false);
                }
              }}
            />
            <Button
              onClick={() => sendAnswer(false)}
              disabled={loading || answer.trim().length < 1 || messages.length === 0}
            >
              Send
            </Button>
          </div>
          {error ? (
            <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm leading-6 text-[#7b3f34]">
              {error}
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <h2 className="font-semibold">Latest feedback</h2>
            {lastFeedback ? (
              <div className="mt-4 space-y-4 text-sm leading-6">
                <p><span className="font-semibold">Correction:</span> {lastFeedback.correction}</p>
                <p><span className="font-semibold">Natural:</span> {lastFeedback.naturalAnswer}</p>
                <p><span className="font-semibold">Score:</span> {lastFeedback.score}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#66716c]">Feedback appears after your first answer.</p>
            )}
          </Panel>
          <Panel>
            <h2 className="font-semibold">Summary</h2>
            {summary ? (
              <div className="mt-4 space-y-4 text-sm leading-6">
                <p>{summary.summaryVi}</p>
                <p><span className="font-semibold">Next:</span> {summary.suggestedNextPractice}</p>
                <p><span className="font-semibold">Score:</span> {summary.score}</p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#66716c]">Use Stop & Summary after a short session.</p>
            )}
          </Panel>
          <Panel>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Recent sessions</h2>
              <button
                className="rounded-[8px] border border-line p-2 transition hover:border-brand"
                onClick={() => void loadHistory()}
                disabled={historyLoading}
                aria-label="Refresh sessions"
              >
                {historyLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
              </button>
            </div>
            {history?.items.length ? (
              <div className="grid gap-3">
                {history.items.map((item) => (
                  <div key={item.id} className="rounded-[8px] border border-line p-4 text-sm leading-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold capitalize">{item.type}</p>
                      <p className="text-xs text-[#66716c]">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="mt-2 text-[#66716c]">
                      Score {item.score ?? "--"} · {item.minutesSpent} min · {item.difficulty ?? "Normal"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-[#66716c]">
                {history?.reason ?? "Saved conversation summaries will appear here."}
              </p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
