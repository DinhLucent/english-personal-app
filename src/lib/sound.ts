"use client";

export const soundEnabledKey = "speakflow:sound-enabled";
export const soundPreferenceEvent = "speakflow:sound-preference-change";

export type SoundCue =
  | "toggle-on"
  | "start"
  | "record-start"
  | "record-stop"
  | "send"
  | "feedback-ready"
  | "retry"
  | "retry-improved"
  | "review-saved"
  | "complete"
  | "error";

type CueNote = {
  frequency: number;
  start: number;
  duration: number;
  gain?: number;
  type?: OscillatorType;
};

type BrowserWindowWithAudio = Window & {
  webkitAudioContext?: typeof AudioContext;
};

const cuePatterns: Record<SoundCue, CueNote[]> = {
  "toggle-on": [
    { frequency: 440, start: 0, duration: 0.055, gain: 0.025 },
    { frequency: 660, start: 0.045, duration: 0.075, gain: 0.022 },
  ],
  start: [
    { frequency: 330, start: 0, duration: 0.055, gain: 0.016, type: "triangle" },
    { frequency: 495, start: 0.045, duration: 0.08, gain: 0.015, type: "triangle" },
  ],
  "record-start": [
    { frequency: 320, start: 0, duration: 0.05, gain: 0.018, type: "triangle" },
    { frequency: 460, start: 0.045, duration: 0.08, gain: 0.018, type: "triangle" },
  ],
  "record-stop": [
    { frequency: 540, start: 0, duration: 0.06, gain: 0.018, type: "triangle" },
    { frequency: 420, start: 0.05, duration: 0.075, gain: 0.016, type: "triangle" },
  ],
  send: [
    { frequency: 520, start: 0, duration: 0.045, gain: 0.016 },
    { frequency: 780, start: 0.04, duration: 0.06, gain: 0.014 },
  ],
  "feedback-ready": [
    { frequency: 392, start: 0, duration: 0.07, gain: 0.018, type: "triangle" },
    { frequency: 523.25, start: 0.06, duration: 0.09, gain: 0.018, type: "triangle" },
    { frequency: 659.25, start: 0.13, duration: 0.11, gain: 0.014, type: "triangle" },
  ],
  retry: [
    { frequency: 360, start: 0, duration: 0.05, gain: 0.015, type: "triangle" },
    { frequency: 540, start: 0.05, duration: 0.075, gain: 0.015, type: "triangle" },
  ],
  "retry-improved": [
    { frequency: 440, start: 0, duration: 0.06, gain: 0.017, type: "triangle" },
    { frequency: 587.33, start: 0.055, duration: 0.085, gain: 0.018, type: "triangle" },
    { frequency: 880, start: 0.13, duration: 0.12, gain: 0.014, type: "triangle" },
  ],
  "review-saved": [
    { frequency: 620, start: 0, duration: 0.055, gain: 0.015 },
    { frequency: 740, start: 0.045, duration: 0.07, gain: 0.014 },
  ],
  complete: [
    { frequency: 392, start: 0, duration: 0.075, gain: 0.018, type: "triangle" },
    { frequency: 523.25, start: 0.065, duration: 0.09, gain: 0.018, type: "triangle" },
    { frequency: 659.25, start: 0.14, duration: 0.1, gain: 0.018, type: "triangle" },
    { frequency: 783.99, start: 0.22, duration: 0.13, gain: 0.014, type: "triangle" },
  ],
  error: [
    { frequency: 196, start: 0, duration: 0.09, gain: 0.016, type: "sine" },
    { frequency: 164.81, start: 0.08, duration: 0.12, gain: 0.014, type: "sine" },
  ],
};

let audioContext: AudioContext | null = null;

export function getSoundEnabledSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(soundEnabledKey) === "true";
}

export function subscribeToSoundPreference(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(soundPreferenceEvent, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(soundPreferenceEvent, onStoreChange);
  };
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;

  localStorage.setItem(soundEnabledKey, String(enabled));
  window.dispatchEvent(new Event(soundPreferenceEvent));
}

function getAudioContext() {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as BrowserWindowWithAudio).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext ??= new AudioContextConstructor();
  return audioContext;
}

function playNote(context: AudioContext, note: CueNote) {
  const now = context.currentTime;
  const startAt = now + note.start;
  const stopAt = startAt + note.duration;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = note.type ?? "sine";
  oscillator.frequency.setValueAtTime(note.frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(note.gain ?? 0.018, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(stopAt + 0.02);
}

export async function playSoundCue(cue: SoundCue) {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return;
  }

  if (!getSoundEnabledSnapshot()) {
    return;
  }

  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    await context.resume();
  }

  cuePatterns[cue].forEach((note) => playNote(context, note));
}
