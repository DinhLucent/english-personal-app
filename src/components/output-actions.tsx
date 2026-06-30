"use client";

import Link from "next/link";
import { ArrowRight, Check, Clipboard, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui";
import { emitLearningEvent } from "@/lib/learning-events";
import { playSoundCue } from "@/lib/sound";

type OutputActionTone = "brand" | "neutral" | "blue" | "violet" | "coral";
type CopyState = "idle" | "copied" | "error";

const actionToneStyles: Record<OutputActionTone, string> = {
  brand: "border-brand/20 bg-brand/5 text-brand hover:border-brand/40 hover:bg-brand/10",
  neutral: "border-line/70 bg-white/90 text-muted hover:border-brand/30 hover:text-brand",
  blue: "border-blue/20 bg-blue/5 text-blue hover:border-blue/40 hover:bg-blue/10",
  violet: "border-violet/20 bg-violet/5 text-violet hover:border-violet/40 hover:bg-violet/10",
  coral: "border-danger-line bg-danger-surface text-danger-text hover:border-coral/50 hover:bg-danger-surface",
};

function actionClass(tone: OutputActionTone, className?: string) {
  return cn(
    "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-control border px-2.5 py-1 text-xs font-semibold leading-none transition-all duration-[var(--motion-fast)] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/15 active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0",
    actionToneStyles[tone],
    className,
  );
}

async function writeClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-1000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard copy failed.");
  }
}

export function OutputActionRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-motion="message"
      className={cn("mt-3 flex flex-wrap items-center gap-2 border-t border-line/30 pt-3", className)}
    >
      {children}
    </div>
  );
}

export function CopyTextButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  tone = "neutral",
  className,
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  tone?: OutputActionTone;
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    try {
      await writeClipboard(text);
      setState("copied");
      emitLearningEvent({ kind: "review", target: "output-copy", cue: "review-saved", intensity: "micro" });
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
      void playSoundCue("error");
      if (resetTimerRef.current) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = window.setTimeout(() => setState("idle"), 1800);
    }
  }

  const Icon = state === "copied" ? Check : Clipboard;
  const visibleLabel = state === "copied" ? copiedLabel : state === "error" ? "Copy failed" : label;
  const statusMessage =
    state === "copied"
      ? "Copied to clipboard."
      : state === "error"
        ? "Copy failed. Try again."
        : "";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={actionClass(tone, className)}
      aria-label={state === "copied" ? "Copied to clipboard" : visibleLabel}
      data-copy-state={state}
      data-output-action="copy"
    >
      <Icon size={14} aria-hidden="true" />
      <span>{visibleLabel}</span>
      <span className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </span>
    </button>
  );
}

export function OutputActionButton({
  label,
  icon: Icon = ArrowRight,
  tone = "brand",
  className,
  onClick,
  disabled,
}: {
  label: string;
  icon?: LucideIcon;
  tone?: OutputActionTone;
  className?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={actionClass(tone, className)}
      data-output-action="button"
    >
      <Icon size={14} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

export function OutputActionLink({
  href,
  label,
  icon: Icon = ArrowRight,
  tone = "brand",
  className,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  tone?: OutputActionTone;
  className?: string;
}) {
  return (
    <Link href={href} className={actionClass(tone, className)} data-output-action="link">
      <Icon size={14} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
