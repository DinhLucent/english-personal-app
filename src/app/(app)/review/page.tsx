"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Repeat2,
  Sparkles,
} from "lucide-react";
import {
  Badge,
  Button,
  cn,
  LinkButton,
  PageHeader,
  Panel,
  ProgressRing,
  Toast,
  EmptyState,
} from "@/components/ui";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import { getJson, postApiJson } from "@/lib/client-api";
import { emitLearningEvent } from "@/lib/learning-events";
import { playSoundCue } from "@/lib/sound";
import type {
  ReviewItem,
  ReviewItemsEnvelope,
  ReviewRating,
  ReviewUpdateResult,
} from "@/lib/supabase/persistence";

type ReviewAction = {
  itemId: string;
  rating: ReviewRating;
};

const ratingActions: Array<{
  rating: ReviewRating;
  label: string;
  detail: string;
  doneLabel: string;
  icon: typeof Repeat2;
  toneClass: string;
}> = [
  {
    rating: "again",
    label: "Again",
    detail: "20 min",
    doneLabel: "Scheduled soon",
    icon: Repeat2,
    toneClass: "border-warning-line text-warning-text hover:border-warning",
  },
  {
    rating: "good",
    label: "Good",
    detail: "next day",
    doneLabel: "Saved for tomorrow",
    icon: CheckCircle2,
    toneClass: "",
  },
  {
    rating: "easy",
    label: "Easy",
    detail: "later",
    doneLabel: "Spaced out",
    icon: Sparkles,
    toneClass: "border-violet/20 text-violet hover:border-violet hover:text-violet",
  },
];

const shortcutRatings: Record<string, ReviewRating> = {
  "1": "again",
  "2": "good",
  "3": "easy",
};

const ratingShortcuts: Record<ReviewRating, string> = {
  again: "1",
  good: "2",
  easy: "3",
};

function focusReviewTargetSoon() {
  window.setTimeout(() => {
    const nextAction = document.querySelector<HTMLButtonElement>("[data-review-action]:not(:disabled)");
    if (nextAction) {
      nextAction.focus();
      return;
    }

    document.getElementById("review-queue-region")?.focus();
  }, 80);
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
}

const sourceMeta: Record<
  ReviewItem["sourceType"],
  {
    label: string;
    priority: string;
    icon: typeof AlertTriangle;
    badgeTone: "brand" | "blue" | "violet" | "amber" | "coral" | "neutral";
    frame: string;
    iconBox: string;
    accent: string;
  }
> = {
  error: {
    label: "Error",
    priority: "Fix first",
    icon: AlertTriangle,
    badgeTone: "coral",
    frame: "border-danger-line bg-danger-surface",
    iconBox: "bg-danger-surface text-danger-text",
    accent: "bg-coral",
  },
  chunk: {
    label: "Chunk",
    priority: "Useful phrase",
    icon: Sparkles,
    badgeTone: "brand",
    frame: "border-brand/20 bg-brand/5",
    iconBox: "bg-brand/10 text-brand",
    accent: "bg-brand",
  },
  vocabulary: {
    label: "Vocabulary",
    priority: "Word recall",
    icon: BookOpenCheck,
    badgeTone: "blue",
    frame: "border-blue/20 bg-blue/5",
    iconBox: "bg-blue/10 text-blue",
    accent: "bg-blue",
  },
  answer: {
    label: "Answer",
    priority: "Model answer",
    icon: MessageSquare,
    badgeTone: "violet",
    frame: "border-violet/20 bg-violet/5",
    iconBox: "bg-violet/10 text-violet",
    accent: "bg-violet",
  },
};

function formatReviewDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "scheduled";
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReviewPageContent() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [sourceReason, setSourceReason] = useState<string | null>(null);
  const [success, setSuccess] = useState<ReviewUpdateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeAction, setActiveAction] = useState<ReviewAction | null>(null);
  const [leavingAction, setLeavingAction] = useState<ReviewAction | null>(null);
  const [lastRating, setLastRating] = useState<ReviewRating | null>(null);
  const [activeTab, changeTab] = useTabSync("due", ["due", "errors", "chunks", "vocabulary", "answers"]);

  const filteredItems = useMemo(() => {
    if (activeTab === "due") return reviewItems;
    if (activeTab === "errors") return reviewItems.filter((item) => item.sourceType === "error");
    if (activeTab === "chunks") return reviewItems.filter((item) => item.sourceType === "chunk");
    if (activeTab === "vocabulary") return reviewItems.filter((item) => item.sourceType === "vocabulary");
    if (activeTab === "answers") return reviewItems.filter((item) => item.sourceType === "answer");
    return reviewItems;
  }, [reviewItems, activeTab]);

  const leaveTimeoutRef = useRef<number | null>(null);

  const dueCount = reviewItems.length;
  const nextDueLabel = useMemo(() => {
    const nextReviewAt = reviewItems[0]?.nextReviewAt;
    return nextReviewAt ? formatReviewDate(nextReviewAt) : "Clear";
  }, [reviewItems]);
  const sourceFocusLabel = useMemo(() => {
    if (!reviewItems.length) return "Clear";

    const sourceCounts = reviewItems.reduce<Record<ReviewItem["sourceType"], number>>(
      (counts, item) => ({
        ...counts,
        [item.sourceType]: counts[item.sourceType] + 1,
      }),
      { error: 0, chunk: 0, vocabulary: 0, answer: 0 },
    );
    const [sourceType, count] =
      Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0] ??
      ["error", 0];
    const meta = sourceMeta[sourceType as ReviewItem["sourceType"]];

    return count ? `${meta.label} (${count})` : "Clear";
  }, [reviewItems]);
  const currentReviewItem = filteredItems[0] ?? null;
  const upcomingReviewItems = filteredItems.slice(1);

  const loadReviewItems = useCallback(async ({ quiet = false } = {}) => {
    if (quiet) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await getJson<ReviewItemsEnvelope>("/api/review?limit=30");
      setReviewItems(response.items);
      setSourceReason(response.reason ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load review items.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadInitialReviewItems() {
      try {
        const response = await getJson<ReviewItemsEnvelope>("/api/review?limit=30");
        if (!active) return;
        setReviewItems(response.items);
        setSourceReason(response.reason ?? null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Could not load review items.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialReviewItems();

    return () => {
      active = false;
      if (leaveTimeoutRef.current !== null) {
        window.clearTimeout(leaveTimeoutRef.current);
      }
    };
  }, []);

  async function markReviewed(itemId: string, rating: ReviewRating) {
    setActiveAction({ itemId, rating });
    setError(null);
    setSuccess(null);
    setLastRating(null);

    try {
      const result = await postApiJson<ReviewUpdateResult>("/api/review", {
        itemId,
        rating,
      });
      setSuccess(result);
      setLastRating(rating);
      setLeavingAction({ itemId, rating });
      emitLearningEvent({
        kind: "review",
        target: '[data-review-item="' + itemId + '"]',
        cue: "review-saved",
      });

      if (leaveTimeoutRef.current !== null) {
        window.clearTimeout(leaveTimeoutRef.current);
      }

      leaveTimeoutRef.current = window.setTimeout(() => {
        setReviewItems((items) => items.filter((item) => item.id !== itemId));
        setLeavingAction((current) => (current?.itemId === itemId ? null : current));
        leaveTimeoutRef.current = null;
        focusReviewTargetSoon();
      }, 260);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update review item.");
      void playSoundCue("error");
    } finally {
      setActiveAction(null);
    }
  }

  useEffect(() => {
    function handleRatingShortcut(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        isEditableTarget(event.target)
      ) {
        return;
      }

      const rating = shortcutRatings[event.key];
      const firstItem = currentReviewItem;

      if (!rating || !firstItem || loading || refreshing || activeAction || leavingAction) {
        return;
      }

      event.preventDefault();
      void markReviewed(firstItem.id, rating);
    }

    window.addEventListener("keydown", handleRatingShortcut);

    return () => window.removeEventListener("keydown", handleRatingShortcut);
  }, [activeAction, currentReviewItem, leavingAction, loading, refreshing, reviewItems]);

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Review"
        title="Due review queue"
        description="Review saved errors, chunks, vocabulary, and stronger answers from your speaking practice."
        action={
          <Button
            variant="secondary"
            onClick={() => void loadReviewItems({ quiet: true })}
            disabled={loading || refreshing}
            icon={
              refreshing ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <RefreshCw size={18} />
              )
            }
          >
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Panel className="p-3 sm:p-[var(--space-panel)]">
          <div className="grid min-w-0 justify-items-center gap-2 text-center sm:flex sm:items-center sm:justify-start sm:text-left">
            <Repeat2 size={18} className="text-brand sm:size-5" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)] sm:text-sm">Due now</p>
              <p className="mt-0.5 text-xl font-semibold sm:mt-1 sm:text-2xl">{dueCount}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-3 sm:p-[var(--space-panel)]">
          <div className="grid min-w-0 justify-items-center gap-2 text-center sm:flex sm:items-center sm:justify-start sm:text-left">
            <Clock size={18} className="text-brand sm:size-5" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)] sm:text-sm">Next due</p>
              <p className="mt-0.5 line-clamp-2 text-xs font-semibold sm:mt-1 sm:text-sm">{nextDueLabel}</p>
            </div>
          </div>
        </Panel>
        <Panel className="p-3 sm:p-[var(--space-panel)]">
          <div className="grid min-w-0 justify-items-center gap-2 text-center sm:flex sm:items-center sm:justify-start sm:text-left">
            <Sparkles size={18} className="text-brand sm:size-5" />
            <div className="min-w-0">
              <p className="text-xs text-[var(--muted)] sm:text-sm">Focus type</p>
              <p className="mt-0.5 line-clamp-2 text-xs font-semibold sm:mt-1 sm:text-sm">{loading ? "Loading" : sourceFocusLabel}</p>
            </div>
          </div>
        </Panel>
      </div>

      <PageTabs
        tabs={[
          { id: "due", label: "Due", icon: <Clock size={16} /> },
          { id: "errors", label: "Errors", icon: <AlertTriangle size={16} /> },
          { id: "chunks", label: "Chunks", icon: <Sparkles size={16} /> },
          { id: "vocabulary", label: "Vocabulary", icon: <BookOpenCheck size={16} /> },
          { id: "answers", label: "Answers", icon: <MessageSquare size={16} /> },
        ]}
        activeTab={activeTab}
        onChange={changeTab}
      />

      {success?.item ? (
        <Toast
          title={
            lastRating
              ? ratingActions.find((action) => action.rating === lastRating)?.doneLabel ?? "Review saved"
              : "Review saved"
          }
          description={`Next review: ${formatReviewDate(success.item.nextReviewAt)}.`}
          tone={lastRating === "again" ? "warning" : "success"}
        />
      ) : null}

      {error ? (
        <div className="rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-4 text-sm leading-6 text-[#7b3f34]">
          {error}
        </div>
      ) : null}

      <div id="review-queue-region" tabIndex={-1} className="outline-none">
        {loading ? (
          <Panel>
            <div className="flex min-h-64 items-center justify-center">
              <Loader2 className="animate-spin text-brand" size={28} />
            </div>
          </Panel>
        ) : currentReviewItem ? (
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Panel className="space-y-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-soft">Current card</p>
                  <h2 className="mt-1 text-lg font-semibold">Review this first</h2>
                </div>
                <Badge tone="brand">{filteredItems.length} due in this tab</Badge>
              </div>
              <ReviewCard
                item={currentReviewItem}
                activeAction={activeAction}
                leavingAction={leavingAction}
                onReview={markReviewed}
              />
            </Panel>
            <ReviewQueuePreview items={upcomingReviewItems} />
          </div>
        ) : activeTab === "due" ? (
          <ClearQueueState sourceReason={sourceReason} />
        ) : (
          <Panel>
            <EmptyState
              title={`No due ${activeTab} items`}
              description={`You have no review items of type "${activeTab}" scheduled for review right now.`}
              tone="neutral"
            />
          </Panel>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  item,
  activeAction,
  leavingAction,
  onReview,
}: {
  item: ReviewItem;
  activeAction: ReviewAction | null;
  leavingAction: ReviewAction | null;
  onReview: (itemId: string, rating: ReviewRating) => void;
}) {
  const meta = sourceMeta[item.sourceType];
  const Icon = meta.icon;
  const leaving = leavingAction?.itemId === item.id;

  return (
    <div
      data-motion={leaving ? "completion" : "row"}
      data-review-item={item.id}
      className={cn(
        "relative overflow-hidden rounded-card border p-3 pl-4 text-sm leading-6 transition-all duration-[260ms] sm:p-5 sm:pl-6",
        meta.frame,
        leaving && "pointer-events-none translate-x-5 scale-[0.98] opacity-0",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", meta.accent)} aria-hidden="true" />
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:gap-3">
          <span className={cn("flex size-10 items-center justify-center rounded-control sm:size-11", meta.iconBox)}>
            <Icon size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={meta.badgeTone}>{meta.label}</Badge>
              <Badge tone="neutral">{meta.priority}</Badge>
              {item.sourceLabel ? (
                <Badge tone={item.sourceInputMode === "voice" ? "blue" : "neutral"}>
                  {item.sourceLabel}
                </Badge>
              ) : null}
            </div>
            <h2 className="mt-2 text-lg font-semibold leading-snug sm:mt-3 sm:text-xl">{item.content}</h2>
          </div>
        </div>
        <p className="text-xs font-semibold text-muted">
          Reviewed {item.reviewCount} time(s)
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2 sm:gap-3">
        {item.meaningVi ? (
          <ReviewDetail label="Meaning" value={item.meaningVi} />
        ) : null}
        {item.example ? (
          <ReviewDetail label="Example" value={item.example} />
        ) : null}
        {item.errorPattern ? (
          <ReviewDetail label="Pattern" value={item.errorPattern} />
        ) : null}
        {item.correctForm ? (
          <ReviewDetail label="Correct form" value={item.correctForm} />
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:flex sm:justify-end">
        {ratingActions.map((action) => {
          const ActionIcon = action.icon;
          const active =
            activeAction?.itemId === item.id &&
            activeAction.rating === action.rating;

          return (
            <Button
              key={action.rating}
              variant={action.rating === "good" ? "primary" : "secondary"}
              className={cn("min-w-0 px-2 text-xs sm:min-w-32 sm:text-sm", action.toneClass)}
              onClick={() => onReview(item.id, action.rating)}
              data-review-action={action.rating}
              aria-keyshortcuts={ratingShortcuts[action.rating]}
              disabled={Boolean(activeAction) || Boolean(leavingAction)}
              icon={
                active ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ActionIcon size={16} />
                )
              }
            >
              <span className="inline-flex min-w-0 flex-col items-center gap-0.5 leading-tight sm:flex-row sm:items-baseline sm:gap-1">
                <span>{action.label}</span>
                <span className="text-xs opacity-75">({action.detail})</span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewQueuePreview({ items }: { items: ReviewItem[] }) {
  const previewItems = items.slice(0, 3);
  const hiddenCount = Math.max(items.length - previewItems.length, 0);

  return (
    <Panel className="h-fit p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-soft">Up next</p>
          <h2 className="mt-1 text-base font-semibold">{items.length ? `${items.length} waiting` : "Queue clear after this"}</h2>
        </div>
        <Badge tone={items.length ? "neutral" : "brand"}>{items.length}</Badge>
      </div>
      {items.length ? (
        <div className="mt-3 grid gap-2">
          {previewItems.map((item, index) => {
            const meta = sourceMeta[item.sourceType];
            const Icon = meta.icon;

            return (
              <div key={item.id} className="rounded-card border border-line/60 bg-white p-3 text-sm leading-5">
                <div className="flex items-start gap-2">
                  <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-control", meta.iconBox)}>
                    <Icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={meta.badgeTone}>#{index + 2}</Badge>
                      <Badge tone="neutral">{meta.label}</Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 font-semibold text-foreground">{item.content}</p>
                    {item.example || item.correctForm || item.meaningVi ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {item.example ?? item.correctForm ?? item.meaningVi}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          {hiddenCount ? (
            <div className="rounded-card border border-dashed border-line bg-panel-muted p-3 text-sm font-semibold text-muted">
              {hiddenCount} more queued after these
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 rounded-card border border-brand/15 bg-brand/5 p-3 text-sm leading-6 text-muted">
          Rate the current card to finish this filtered queue.
        </p>
      )}
    </Panel>
  );
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-line/60 bg-white/80 p-2.5 sm:p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  );
}

function ClearQueueState({ sourceReason }: { sourceReason: string | null }) {
  const unavailable = Boolean(sourceReason);

  return (
    <div
      data-motion="completion"
      className="grid min-h-64 gap-4 rounded-card border border-brand/20 bg-[var(--surface-success)] p-4 sm:p-5 md:min-h-72 md:grid-cols-[auto_1fr] md:items-center"
    >
      <div className="flex justify-center md:justify-start">
        <ProgressRing
          value={unavailable ? 0 : 1}
          max={1}
          size={96}
          stroke={9}
          label="Queue"
          detail={unavailable ? "offline" : "clear"}
          tone={unavailable ? "amber" : "brand"}
        />
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={unavailable ? "amber" : "brand"}>
            {unavailable ? "Review unavailable" : "Clear queue"}
          </Badge>
          <Badge tone="neutral">Spaced review</Badge>
        </div>
        <h2 className="mt-3 text-xl font-semibold sm:mt-4 sm:text-2xl">
          {unavailable ? "Review queue is waiting for data" : "You are caught up"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          {sourceReason ??
            "No due cards right now. Start a speaking mission to create fresh chunks, errors, vocabulary, and model answers for the next review cycle."}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:mt-5 sm:flex-row sm:gap-3">
          <LinkButton href="/speaking" icon={<MessageSquare size={18} />}>
            Open Speaking
          </LinkButton>
          <LinkButton href="/dashboard" variant="secondary" icon={<ArrowRight size={18} />}>
            Dashboard
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-brand" size={28} /></div>}>
      <ReviewPageContent />
    </Suspense>
  );
}
