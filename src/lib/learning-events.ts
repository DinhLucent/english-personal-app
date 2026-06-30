"use client";

import { playSoundCue, type SoundCue } from "@/lib/sound";

export const learningEventName = "speakflow:learning-event";

export type LearningEventKind = "start" | "send" | "feedback" | "retry" | "review" | "complete";

export type LearningEventDetail = {
  kind: LearningEventKind;
  target?: string;
  cue?: SoundCue | false;
  intensity?: "micro" | "standard" | "strong";
  delayMs?: number;
};

export function emitLearningEvent({
  kind,
  target,
  cue,
  intensity = "standard",
  delayMs = 0,
}: LearningEventDetail) {
  if (typeof window === "undefined") return;

  const run = () => {
    window.dispatchEvent(
      new CustomEvent(learningEventName, {
        detail: { kind, target, intensity } satisfies Omit<LearningEventDetail, "cue" | "delayMs">,
      }),
    );

    if (cue) {
      void playSoundCue(cue);
    }
  };

  if (delayMs > 0) {
    window.setTimeout(run, delayMs);
    return;
  }

  run();
}
