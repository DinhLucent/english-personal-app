"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Mic,
  PenLine,
  Repeat2,
  Sparkles,
  Square,
  Target,
  Volume2,
} from "lucide-react";
import {
  Badge,
  Button,
  cn,
  EmptyState,
  FieldLabel,
  LinkButton,
  PageHeader,
  Panel,
  ProgressRing,
  Stepper,
  Textarea,
  type StepperStep,
} from "@/components/ui";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import { postJson, type PersistenceEnvelope } from "@/lib/client-api";
import { fireConfetti } from "@/lib/confetti";
import { emitLearningEvent } from "@/lib/learning-events";
import { playSoundCue } from "@/lib/sound";
import type {
  SpeakingFeedback,
  SpeakingInputMode,
  SpeakingRetryFeedback,
  SpeakingRoleplayReply,
  SpeakingVoiceMetrics,
} from "@/lib/ai/schemas";
import type { SpeakingMission } from "@/lib/missions";

type RoleplayMessage = {
  role: "user" | "assistant";
  content: string;
};

type VoiceTarget = "roleplay" | "retry";

type VoiceTranscriptState =
  | "ready"
  | "unsupported"
  | "listening"
  | "transcript-ready"
  | "edited"
  | "submitted";

type VoiceDraft = {
  state: VoiceTranscriptState;
  inputMode: SpeakingInputMode;
  transcript: string;
  recordingMs: number | null;
  wordCount: number;
  wordsPerMinute: number | null;
  transcriptEdited: boolean;
  attemptLengthSignal: SpeakingVoiceMetrics["attemptLengthSignal"];
};

type SpeechTarget = string;

type BrowserSpeechRecognitionEvent = {
  results: {
    length: number;
    [index: number]: {
      0?: {
        transcript: string;
      };
    };
  };
};

type BrowserSpeechRecognitionErrorEvent = {
  error?: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function focusElementSoon(id: string) {
  window.setTimeout(() => document.getElementById(id)?.focus(), 80);
}

function getSpeechRecognitionConstructor() {
  const browserWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

type SpeakingStudioClientProps = {
  mission: SpeakingMission;
  totalMissions: number;
  resolutionReason?: string | null;
};

const stepMeta = [
  {
    key: "prepare",
    title: "Prepare",
    detail: "Mission context and target chunks.",
    icon: BookOpenCheck,
  },
  {
    key: "drill",
    title: "Chunk Drill",
    detail: "Practice the useful phrases out loud.",
    icon: Repeat2,
  },
  {
    key: "roleplay",
    title: "Roleplay",
    detail: "Answer inside the workplace scenario.",
    icon: MessageSquare,
  },
  {
    key: "feedback",
    title: "Feedback",
    detail: "Rubric scores and better answer.",
    icon: PenLine,
  },
  {
    key: "retry",
    title: "Retry",
    detail: "Improve one weak part.",
    icon: Target,
  },
  {
    key: "review",
    title: "Review",
    detail: "Save review candidates.",
    icon: Sparkles,
  },
] as const;

type StudioStepKey = (typeof stepMeta)[number]["key"];

const scoreLabels: Array<{
  key: keyof SpeakingFeedback["scores"];
  label: string;
}> = [
  { key: "taskCompletion", label: "Task" },
  { key: "fluency", label: "Fluency" },
  { key: "accuracy", label: "Accuracy" },
  { key: "vocabulary", label: "Vocab" },
  { key: "interaction", label: "Interaction" },
];

function formatRoleplayReply(reply: SpeakingRoleplayReply) {
  return [reply.reply, reply.nextQuestion].filter(Boolean).join("\n\n");
}

function getPersistenceMessage(persistence: PersistenceEnvelope) {
  const reviewDetail =
    typeof persistence.reviewItemsCreated === "number"
      ? ` Review queue: ${persistence.reviewItemsCreated} item(s).`
      : "";
  const reviewWarning = persistence.reviewItemsReason
    ? ` Review save warning: ${persistence.reviewItemsReason}`
    : "";

  if (persistence.saved) {
    if (persistence.status === "completed") {
      return `Mission attempt completed and saved.${reviewDetail}${reviewWarning}`;
    }

    return `Saved ${persistence.currentStep ?? "speaking progress"} to Supabase.${reviewDetail}${reviewWarning}`;
  }

  return `Practice is available, but not saved: ${persistence.reason ?? "persistence unavailable."}`;
}

function getVoiceTargetLabel(target: VoiceTarget) {
  return target === "roleplay" ? "roleplay answer" : "retry answer";
}

function getEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();

  return (
    voices.find((voice) => voice.lang === "en-US") ??
    voices.find((voice) => voice.lang.startsWith("en")) ??
    null
  );
}

function getScoreTone(score: number) {
  if (score >= 4) {
    return {
      label: "Strong",
      tone: "brand" as const,
      card: "border-brand/25 bg-brand/5",
      text: "text-brand",
      bar: "bg-brand",
    };
  }

  if (score >= 3) {
    return {
      label: "Developing",
      tone: "amber" as const,
      card: "border-warning-line bg-warning-surface",
      text: "text-warning-text",
      bar: "bg-warning-text",
    };
  }

  return {
    label: "Focus",
    tone: "coral" as const,
    card: "border-danger-line bg-danger-surface",
    text: "text-danger-text",
    bar: "bg-danger-text",
  };
}

function countWords(text: string) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getAttemptLengthSignal(wordCount: number): SpeakingVoiceMetrics["attemptLengthSignal"] {
  if (wordCount < 8) return "too_short";
  if (wordCount > 90) return "long";
  return "focused";
}

function buildVoiceDraft({
  state = "ready",
  inputMode = "typed",
  text = "",
  transcript = "",
  recordingMs = null,
  transcriptEdited = false,
}: {
  state?: VoiceTranscriptState;
  inputMode?: SpeakingInputMode;
  text?: string;
  transcript?: string;
  recordingMs?: number | null;
  transcriptEdited?: boolean;
} = {}): VoiceDraft {
  const wordCount = countWords(text);
  const wordsPerMinute =
    inputMode === "voice" && recordingMs && recordingMs > 0
      ? Math.round((wordCount / (recordingMs / 60000)) * 10) / 10
      : null;

  return {
    state,
    inputMode,
    transcript,
    recordingMs,
    wordCount,
    wordsPerMinute,
    transcriptEdited,
    attemptLengthSignal: getAttemptLengthSignal(wordCount),
  };
}

function getDeliveryPayload(draft: VoiceDraft, text: string) {
  const nextDraft = buildVoiceDraft({
    state: "submitted",
    inputMode: draft.inputMode,
    text,
    transcript: draft.transcript,
    recordingMs: draft.recordingMs,
    transcriptEdited: draft.inputMode === "voice" ? draft.transcript.trim() !== text.trim() : false,
  });

  return {
    inputMode: nextDraft.inputMode,
    voiceMetrics: {
      recordingMs: nextDraft.recordingMs,
      wordCount: nextDraft.wordCount,
      wordsPerMinute: nextDraft.wordsPerMinute,
      transcriptEdited: nextDraft.transcriptEdited,
      attemptLengthSignal: nextDraft.attemptLengthSignal,
    },
    draft: nextDraft,
  };
}

function formatDeliveryMetric(value: number | null, suffix = "") {
  return value === null ? "--" : `${value}${suffix}`;
}

function formatAttemptLengthSignal(signal: SpeakingVoiceMetrics["attemptLengthSignal"]) {
  if (signal === "too_short") return "Too short";
  if (signal === "long") return "Long";
  return "Focused";
}

function getAverageScore(scores: SpeakingFeedback["scores"] | SpeakingRetryFeedback["scores"]) {
  const values = Object.values(scores);

  return Math.round((values.reduce((sum, score) => sum + score, 0) / values.length) * 10) / 10;
}

function getFeedbackAverage(feedback: SpeakingFeedback) {
  return getAverageScore(feedback.scores);
}

function getRetryAverage(feedback: SpeakingRetryFeedback) {
  return getAverageScore(feedback.scores);
}

function formatDelta(delta: number) {
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;
}

export function SpeakingStudioClient({
  mission,
  totalMissions,
  resolutionReason,
}: SpeakingStudioClientProps) {
  const primaryChunk = mission.targetChunks[0];
  const secondaryChunk = mission.targetChunks[1];
  const firstQuestion = mission.practiceQuestions[0] ?? mission.goal;
  const [roleplayMessages, setRoleplayMessages] = useState<RoleplayMessage[]>([]);
  const [roleplayAnswer, setRoleplayAnswer] = useState("");
  const [lastPrompt, setLastPrompt] = useState(mission.roleplayPrompt);
  const [lastLearnerAnswer, setLastLearnerAnswer] = useState("");
  const [lastSpeakingAttemptId, setLastSpeakingAttemptId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [retryAnswer, setRetryAnswer] = useState("");
  const [retryFeedback, setRetryFeedback] = useState<SpeakingRetryFeedback | null>(null);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceEnvelope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [roleplayLoading, setRoleplayLoading] = useState(false);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [retryLoading, setRetryLoading] = useState(false);
  const [focusFeedbackAfterRoleplay, setFocusFeedbackAfterRoleplay] = useState(false);
  const [focusRetryAfterFeedback, setFocusRetryAfterFeedback] = useState(false);
  const [focusReviewAfterRetry, setFocusReviewAfterRetry] = useState(false);
  const [voiceTarget, setVoiceTarget] = useState<VoiceTarget | null>(null);
  const [voiceMessageTarget, setVoiceMessageTarget] = useState<VoiceTarget | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceDrafts, setVoiceDrafts] = useState<Record<VoiceTarget, VoiceDraft>>({
    roleplay: buildVoiceDraft(),
    retry: buildVoiceDraft(),
  });
  const [lastLearnerDelivery, setLastLearnerDelivery] = useState<{
    inputMode: SpeakingInputMode;
    voiceMetrics: SpeakingVoiceMetrics;
  } | null>(null);
  const [lastRetryDelivery, setLastRetryDelivery] = useState<{
    inputMode: SpeakingInputMode;
    voiceMetrics: SpeakingVoiceMetrics;
  } | null>(null);
  const [speechTarget, setSpeechTarget] = useState<SpeechTarget | null>(null);
  const [speechStatus, setSpeechStatus] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceBaseTextRef = useRef("");
  const voiceStartedAtRef = useRef<Record<VoiceTarget, number | null>>({
    roleplay: null,
    retry: null,
  });
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const completionMomentRef = useRef<string | null>(null);

  const targetChunkText = useMemo(
    () => mission.targetChunks.map((chunk) => chunk.text).join(", "),
    [mission.targetChunks],
  );

  const activeStep = useMemo<StudioStepKey>(() => {
    if (retryFeedback) return "review";
    if (feedback) return "retry";
    if (feedbackLoading || lastLearnerAnswer) return "feedback";
    if (roleplayMessages.length || roleplayLoading || roleplayAnswer.trim() || voiceTarget === "roleplay") {
      return "roleplay";
    }

    return "prepare";
  }, [
    feedback,
    feedbackLoading,
    lastLearnerAnswer,
    retryFeedback,
    roleplayAnswer,
    roleplayLoading,
    roleplayMessages.length,
    voiceTarget,
  ]);
  const activeStepIndex = Math.max(
    stepMeta.findIndex((step) => step.key === activeStep),
    0,
  );
  const defaultTab = activeStep === "prepare" ? "mission" : activeStep;
  const [activeTab, changeTab] = useTabSync(defaultTab, [
    "mission",
    "drill",
    "roleplay",
    "feedback",
    "retry",
    "review",
  ]);
  const studioSteps = useMemo<StepperStep[]>(
    () =>
      stepMeta.map((step, index) => {
        const Icon = step.icon;

        return {
          id: step.key,
          label: step.title,
          detail: step.detail,
          icon: <Icon size={16} />,
          status:
            index < activeStepIndex
              ? "complete"
              : index === activeStepIndex
                ? "active"
                : "pending",
        };
      }),
    [activeStepIndex],
  );
  const feedbackAverage = useMemo(
    () => (feedback ? getFeedbackAverage(feedback) : null),
    [feedback],
  );
  const feedbackAverageTone = feedbackAverage !== null ? getScoreTone(feedbackAverage) : null;
  const retryAverage = useMemo(
    () => (retryFeedback ? getRetryAverage(retryFeedback) : null),
    [retryFeedback],
  );
  const retryDelta =
    retryAverage !== null && feedbackAverage !== null
      ? Math.round((retryAverage - feedbackAverage) * 10) / 10
      : null;
  const missionCompleted = persistenceStatus?.status === "completed";
  const reviewItemsCreated =
    persistenceStatus?.reviewItemsCreated ?? retryFeedback?.reviewCandidates.length ?? 0;

  useEffect(() => {
    const chat = chatScrollRef.current;

    if (!chat) return;

    chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [roleplayLoading, roleplayMessages.length]);

  useEffect(() => {
    if (!focusFeedbackAfterRoleplay || roleplayLoading || !lastLearnerAnswer || activeTab !== "roleplay") {
      return;
    }

    const timer = window.setTimeout(() => {
      const feedbackAction = document.getElementById("speaking-feedback-action") as HTMLButtonElement | null;

      if (feedbackAction && !feedbackAction.disabled) {
        feedbackAction.focus();
        setFocusFeedbackAfterRoleplay(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, focusFeedbackAfterRoleplay, lastLearnerAnswer, roleplayLoading]);

  useEffect(() => {
    if (!focusRetryAfterFeedback || feedbackLoading || !feedback || activeTab !== "retry") {
      return;
    }

    const timer = window.setTimeout(() => {
      const retryAnswerInput = document.getElementById("speaking-retry-answer");

      if (retryAnswerInput) {
        retryAnswerInput.focus();
        setFocusRetryAfterFeedback(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, feedback, feedbackLoading, focusRetryAfterFeedback]);

  useEffect(() => {
    if (!focusReviewAfterRetry || retryLoading || !retryFeedback || activeTab !== "review") {
      return;
    }

    const timer = window.setTimeout(() => {
      const reviewPanel = document.getElementById("speaking-review-panel");

      if (reviewPanel) {
        reviewPanel.focus();
        setFocusReviewAfterRetry(false);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [activeTab, focusReviewAfterRetry, retryFeedback, retryLoading]);

  useEffect(() => {
    if (!retryFeedback) return;

    const momentKey = [
      mission.id,
      persistenceStatus?.id,
      persistenceStatus?.speakingAttemptId,
      persistenceStatus?.status,
      retryFeedback.improved ? "improved" : "not-yet",
      retryFeedback.comparisonVi,
    ].join(":");

    if (completionMomentRef.current === momentKey) return;

    completionMomentRef.current = momentKey;

    if (missionCompleted && retryFeedback.improved) {
      emitLearningEvent({
        kind: "complete",
        target: "#speaking-review-panel",
        cue: "retry-improved",
        intensity: "strong",
        delayMs: 80,
      });
      fireConfetti({
        particleCount: 44,
        durationMs: 1800,
        soundCue: false,
      });
      localStorage.setItem("speakflow:speaking-completed", "true");
      window.dispatchEvent(new Event("speakflow:progress-update"));
      return;
    }

    if (missionCompleted) {
      emitLearningEvent({
        kind: "complete",
        target: "#speaking-review-panel",
        cue: "review-saved",
        intensity: "strong",
        delayMs: 80,
      });
      localStorage.setItem("speakflow:speaking-completed", "true");
      window.dispatchEvent(new Event("speakflow:progress-update"));
      return;
    }

    if (retryFeedback.improved) {
      emitLearningEvent({
        kind: "retry",
        target: "#speaking-review-panel",
        cue: "retry-improved",
        delayMs: 80,
      });
    }
  }, [
    mission.id,
    missionCompleted,
    persistenceStatus?.id,
    persistenceStatus?.speakingAttemptId,
    persistenceStatus?.status,
    retryFeedback,
  ]);

  function stopVoiceInput() {
    if (recognitionRef.current) {
      void playSoundCue("record-stop");
      recognitionRef.current.stop();
    }
  }

  function stopSpeech() {
    window.speechSynthesis.cancel();
    speechUtteranceRef.current = null;
    setSpeechTarget(null);
    setSpeechStatus("Audio stopped.");
  }

  function updateAnswerFromInput(target: VoiceTarget, value: string) {
    if (target === "roleplay") {
      setRoleplayAnswer(value);
    } else {
      setRetryAnswer(value);
    }

    setVoiceDrafts((drafts) => {
      const current = drafts[target];

      if (current.inputMode !== "voice") {
        return {
          ...drafts,
          [target]: buildVoiceDraft({ text: value }),
        };
      }

      return {
        ...drafts,
        [target]: buildVoiceDraft({
          state: current.transcript.trim() === value.trim() ? "transcript-ready" : "edited",
          inputMode: "voice",
          text: value,
          transcript: current.transcript,
          recordingMs: current.recordingMs,
          transcriptEdited: current.transcript.trim() !== value.trim(),
        }),
      };
    });
  }

  function speakText(text: string, target: SpeechTarget, label = "Audio") {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      setSpeechError("Text-to-speech is not supported in this browser.");
      setSpeechStatus(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.voice = getEnglishVoice();
    utterance.onend = () => {
      speechUtteranceRef.current = null;
      setSpeechTarget(null);
      setSpeechStatus(`${label} playback finished.`);
    };
    utterance.onerror = () => {
      speechUtteranceRef.current = null;
      setSpeechTarget(null);
      setSpeechError("Could not play the better answer audio.");
      setSpeechStatus(null);
    };

    speechUtteranceRef.current = utterance;
    setSpeechTarget(target);
    setSpeechError(null);
    setSpeechStatus(`Playing ${label.toLowerCase()}...`);
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput(target: VoiceTarget) {
    const Recognition = getSpeechRecognitionConstructor();

    if (!Recognition) {
      setVoiceMessageTarget(target);
      setVoiceError("Voice transcript is not supported in this browser. Try Chrome or Edge.");
      setVoiceStatus(null);
      setVoiceDrafts((drafts) => ({
        ...drafts,
        [target]: {
          ...drafts[target],
          state: "unsupported",
        },
      }));
      return;
    }

    recognitionRef.current?.abort();
    voiceBaseTextRef.current =
      target === "roleplay" ? roleplayAnswer.trim() : retryAnswer.trim();
    voiceStartedAtRef.current[target] = Date.now();

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0]?.transcript ?? "";
      }

      const cleanedTranscript = transcript.trim();
      const baseText = voiceBaseTextRef.current;
      const nextText = [baseText, cleanedTranscript].filter(Boolean).join(baseText ? " " : "");
      const recordingMs =
        voiceStartedAtRef.current[target] !== null
          ? Date.now() - (voiceStartedAtRef.current[target] ?? Date.now())
          : null;

      if (target === "roleplay") {
        setRoleplayAnswer(nextText);
      } else {
        setRetryAnswer(nextText);
      }

      setVoiceDrafts((drafts) => ({
        ...drafts,
        [target]: buildVoiceDraft({
          state: "transcript-ready",
          inputMode: "voice",
          text: nextText,
          transcript: nextText,
          recordingMs,
          transcriptEdited: false,
        }),
      }));

      if (cleanedTranscript) {
        setVoiceMessageTarget(target);
        setVoiceStatus(`Transcript ready for ${getVoiceTargetLabel(target)}. You can edit it before sending.`);
      }
    };
    recognition.onerror = (event) => {
      setVoiceMessageTarget(target);
      setVoiceError(event.message || `Voice transcript failed: ${event.error ?? "unknown error"}.`);
      setVoiceStatus(null);
      setVoiceDrafts((drafts) => ({
        ...drafts,
        [target]: {
          ...drafts[target],
          state: event.error === "not-allowed" || event.error === "service-not-allowed" ? "unsupported" : "ready",
        },
      }));
    };
    recognition.onend = () => {
      setVoiceTarget(null);
      recognitionRef.current = null;
      const recordingMs =
        voiceStartedAtRef.current[target] !== null
          ? Date.now() - (voiceStartedAtRef.current[target] ?? Date.now())
          : null;
      voiceStartedAtRef.current[target] = null;
      setVoiceDrafts((drafts) => {
        const current = drafts[target];

        if (current.inputMode !== "voice" || current.state === "unsupported") {
          return drafts;
        }

        return {
          ...drafts,
          [target]: buildVoiceDraft({
            state: current.transcript ? current.state : "ready",
            inputMode: "voice",
            text: target === "roleplay" ? roleplayAnswer : retryAnswer,
            transcript: current.transcript,
            recordingMs: current.recordingMs ?? recordingMs,
            transcriptEdited: current.transcriptEdited,
          }),
        };
      });
    };

    recognitionRef.current = recognition;
    setVoiceTarget(target);
    setVoiceMessageTarget(target);
    setVoiceError(null);
    setVoiceStatus(`Listening for ${getVoiceTargetLabel(target)}...`);
    setVoiceDrafts((drafts) => ({
      ...drafts,
      [target]: buildVoiceDraft({
        state: "listening",
        inputMode: "voice",
        text: target === "roleplay" ? roleplayAnswer : retryAnswer,
        transcript: drafts[target].transcript,
        recordingMs: 0,
      }),
    }));

    try {
      recognition.start();
      void playSoundCue("record-start");
    } catch (err) {
      setVoiceTarget(null);
      recognitionRef.current = null;
      setVoiceError(err instanceof Error ? err.message : "Could not start voice recording.");
      setVoiceStatus(null);
    }
  }

  async function startRoleplay() {
    emitLearningEvent({ kind: "start", target: "#speaking-start-action", cue: "start", intensity: "micro" });
    setRoleplayLoading(true);
    changeTab("roleplay");
    setError(null);
    setFeedback(null);
    setRetryFeedback(null);
    setPersistenceStatus(null);
    setLastSpeakingAttemptId(null);
    setLastLearnerDelivery(null);
    setLastRetryDelivery(null);
    setVoiceDrafts({
      roleplay: buildVoiceDraft(),
      retry: buildVoiceDraft(),
    });
    setVoiceStatus(null);
    setVoiceError(null);
    window.speechSynthesis.cancel();
    setSpeechTarget(null);
    setSpeechStatus(null);
    setSpeechError(null);
    recognitionRef.current?.abort();

    try {
      const response = await postJson<SpeakingRoleplayReply>("/api/ai/speaking", {
        mode: "roleplay",
        missionId: mission.id,
        messages: [],
      });
      const assistantText = formatRoleplayReply(response.data);
      setRoleplayMessages([{ role: "assistant", content: assistantText }]);
      setLastPrompt(response.data.nextQuestion || response.data.reply || mission.roleplayPrompt);
      setPersistenceStatus(response.persistence ?? null);
      focusElementSoon("speaking-roleplay-answer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start roleplay.");
    } finally {
      setRoleplayLoading(false);
    }
  }

  async function sendRoleplayAnswer() {
    const trimmedAnswer = roleplayAnswer.trim();
    if (!trimmedAnswer) return;

    emitLearningEvent({ kind: "send", target: "#speaking-send-action", cue: "send", intensity: "micro" });
    setRoleplayLoading(true);
    setError(null);
    setFeedback(null);
    setRetryFeedback(null);
    setPersistenceStatus(null);
    setVoiceStatus(null);
    setVoiceError(null);
    setSpeechTarget(null);
    setSpeechStatus(null);
    setSpeechError(null);

    const nextMessages: RoleplayMessage[] = [
      ...roleplayMessages,
      { role: "user", content: trimmedAnswer },
    ];
    const delivery = getDeliveryPayload(voiceDrafts.roleplay, trimmedAnswer);

    try {
      const response = await postJson<SpeakingRoleplayReply>("/api/ai/speaking", {
        mode: "roleplay",
        missionId: mission.id,
        messages: nextMessages,
        inputMode: delivery.inputMode,
        voiceMetrics: delivery.voiceMetrics,
      });
      const assistantText = formatRoleplayReply(response.data);
      setRoleplayMessages([
        ...nextMessages,
        { role: "assistant", content: assistantText },
      ]);
      setLastPrompt(response.data.nextQuestion || response.data.expectedFocus || firstQuestion);
      setLastLearnerAnswer(trimmedAnswer);
      setLastLearnerDelivery({
        inputMode: delivery.inputMode,
        voiceMetrics: delivery.voiceMetrics,
      });
      setVoiceDrafts((drafts) => ({
        ...drafts,
        roleplay: delivery.draft,
      }));
      setRoleplayAnswer("");
      setVoiceStatus(null);
      setSpeechStatus(null);
      setPersistenceStatus(response.persistence ?? null);
      setFocusFeedbackAfterRoleplay(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Roleplay failed.");
    } finally {
      setRoleplayLoading(false);
    }
  }

  async function requestFeedback() {
    if (!lastLearnerAnswer.trim()) return;

    setFeedbackLoading(true);
    changeTab("feedback");
    setError(null);
    setRetryFeedback(null);

    try {
      const response = await postJson<SpeakingFeedback>("/api/ai/speaking", {
        mode: "feedback",
        missionId: mission.id,
        prompt: lastPrompt,
        userAnswer: lastLearnerAnswer,
        roleplayMessages,
        inputMode: lastLearnerDelivery?.inputMode ?? "typed",
        voiceMetrics: lastLearnerDelivery?.voiceMetrics,
      });
      setFeedback(response.data);
      emitLearningEvent({
        kind: "feedback",
        target: "#speaking-feedback-panel",
        cue: "feedback-ready",
        delayMs: 80,
      });
      setLastSpeakingAttemptId(
        response.persistence?.speakingAttemptId ?? response.persistence?.id ?? null,
      );
      setPersistenceStatus(response.persistence ?? null);
      setRetryAnswer("");
      setVoiceDrafts((drafts) => ({
        ...drafts,
        retry: buildVoiceDraft(),
      }));
      setVoiceStatus(null);
      setVoiceError(null);
      setSpeechStatus(null);
      setSpeechError(null);
      changeTab("retry");
      setFocusRetryAfterFeedback(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback failed.");
    } finally {
      setFeedbackLoading(false);
    }
  }

  async function submitRetry() {
    const trimmedRetry = retryAnswer.trim();
    if (!feedback || !lastLearnerAnswer.trim() || !trimmedRetry) return;

    emitLearningEvent({ kind: "retry", target: "#speaking-retry-action", cue: "retry", intensity: "micro" });
    setRetryLoading(true);
    setError(null);
    const delivery = getDeliveryPayload(voiceDrafts.retry, trimmedRetry);

    try {
      const response = await postJson<SpeakingRetryFeedback>("/api/ai/speaking", {
        mode: "retry-feedback",
        missionId: mission.id,
        originalAnswer: lastLearnerAnswer,
        retryAnswer: trimmedRetry,
        retryOf: lastSpeakingAttemptId ?? undefined,
        previousFeedback: feedback,
        inputMode: delivery.inputMode,
        voiceMetrics: delivery.voiceMetrics,
      });
      setRetryFeedback(response.data);
      setLastRetryDelivery({
        inputMode: delivery.inputMode,
        voiceMetrics: delivery.voiceMetrics,
      });
      setVoiceDrafts((drafts) => ({
        ...drafts,
        retry: delivery.draft,
      }));
      setPersistenceStatus(response.persistence ?? null);
      setVoiceStatus(null);
      changeTab("review");
      setFocusReviewAfterRetry(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry feedback failed.");
    } finally {
      setRetryLoading(false);
    }
  }

  const tabItems = [
    { id: "mission", label: "Mission", icon: <BookOpenCheck size={16} /> },
    { id: "drill", label: "Drill", icon: <Repeat2 size={16} /> },
    { id: "roleplay", label: "Roleplay", icon: <MessageSquare size={16} /> },
    { id: "feedback", label: "Feedback", icon: <PenLine size={16} /> },
    { id: "retry", label: "Retry", icon: <Target size={16} /> },
    { id: "review", label: "Review", icon: <Sparkles size={16} /> },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Speaking Studio"
        title={mission.title}
        description={mission.goal}
        action={
          <Button
            id="speaking-start-action"
            onClick={startRoleplay}
            disabled={roleplayLoading}
            icon={
              roleplayLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <MessageSquare size={18} />
              )
            }
          >
            Start Roleplay
          </Button>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "mission" && (
        <div className="grid gap-3 md:gap-4 xl:grid-cols-[1.1fr_0.9fr] animate-fadeIn" role="tabpanel" id="tabpanel-mission" aria-labelledby="tab-mission">
          <div className="space-y-4 md:space-y-6">
            <Panel>
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand">
                    Day {mission.dayNumber} of {totalMissions} - {mission.estimatedMinutes} min
                  </p>
                  <h2 className="mt-2 text-xl font-semibold sm:text-2xl">{mission.scenario}</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {mission.roleplayPrompt}
                  </p>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-brand/[0.08] text-brand">
                  <Target size={22} />
                </span>
              </div>

              {resolutionReason ? (
                <p className="mt-4 rounded-[8px] border border-line bg-panel-muted p-3 text-sm text-[var(--muted)]">
                  {resolutionReason}
                </p>
              ) : null}

              <div className="mt-4 grid gap-2.5 sm:mt-6 sm:gap-3 md:grid-cols-3">
                {mission.targetVocabulary.slice(0, 3).map((item) => (
                  <div key={item.word} className="rounded-[8px] border border-line/60 bg-white p-3 text-sm sm:p-4">
                    <p className="font-semibold">{item.word}</p>
                    <p className="mt-1 text-[var(--muted)]">{item.meaningVi}</p>
                    <p className="mt-3 leading-6">{item.example}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center gap-3">
                <BookOpenCheck size={20} className="text-brand" />
                <h2 className="text-lg font-semibold">Prepare Target Chunks</h2>
              </div>
              <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3">
                {mission.targetChunks.map((chunk) => (
                  <div key={chunk.text} className="rounded-[8px] border border-line/60 bg-white p-3 text-sm sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold">{chunk.text}</p>
                        <p className="mt-1 text-[var(--muted)]">{chunk.meaningVi}</p>
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => speakText(chunk.example, `chunk-${chunk.text}`, "chunk example")}
                        disabled={speechTarget !== null}
                        icon={<Volume2 size={16} />}
                      >
                        Listen
                      </Button>
                    </div>
                    <p className="mt-3 leading-6">{chunk.example}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-4 md:space-y-6">
            <Panel>
              <div className="grid gap-4 md:grid-cols-[auto_1fr] md:items-center xl:grid-cols-1">
                <div className="flex justify-center md:justify-start xl:justify-center">
                  <ProgressRing
                    value={activeStepIndex + 1}
                    max={stepMeta.length}
                    size={112}
                    stroke={9}
                    label="Flow"
                    detail={`${activeStepIndex + 1}/${stepMeta.length}`}
                    tone={feedback ? "violet" : "brand"}
                  />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="brand">Active loop</Badge>
                    <Badge tone={feedback ? "violet" : "neutral"}>
                      {stepMeta[activeStepIndex]?.title ?? "Prepare"}
                    </Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">Speaking flow</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Prepare the language, answer in context, improve one weak spot, then keep useful items for review.
                  </p>
                </div>
              </div>
              <Stepper steps={studioSteps} className="mt-4 sm:mt-5" />
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "drill" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-drill" aria-labelledby="tab-drill">
          <Panel>
            <div className="flex items-center gap-3">
              <Repeat2 size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Chunk Drill</h2>
            </div>
            <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3">
              {mission.practiceQuestions.map((question) => (
                <ShadowingPromptCard
                  key={question}
                  question={question}
                  primaryChunk={primaryChunk?.text ?? "a target chunk"}
                  secondaryChunk={secondaryChunk?.text}
                  onListen={() => speakText(question, `question-${question}`, "shadowing prompt")}
                  disabled={speechTarget !== null}
                />
              ))}
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "roleplay" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-roleplay" aria-labelledby="tab-roleplay">
          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={20} className="text-brand" />
                <h2 className="text-lg font-semibold">Roleplay Dialogue</h2>
              </div>
              <Button
                variant="secondary"
                onClick={startRoleplay}
                disabled={roleplayLoading}
                icon={
                  roleplayLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <MessageSquare size={16} />
                  )
                }
              >
                Restart
              </Button>
            </div>

            <div
              ref={chatScrollRef}
              className="mt-4 min-h-72 max-h-[440px] overflow-y-auto rounded-[8px] border border-line bg-white p-3 sm:mt-5 sm:min-h-80 sm:max-h-[520px] sm:p-4"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
              aria-label="Speaking roleplay messages"
            >
              <div className="space-y-3">
                {roleplayMessages.length ? (
                  roleplayMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      data-motion="message"
                      className={cn(
                        "max-w-[90%] whitespace-pre-line rounded-[8px] px-3 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[88%] sm:px-4 sm:py-3",
                        message.role === "user"
                          ? "ml-auto bg-gradient-to-r from-brand to-brand-strong text-white"
                          : "mr-auto border border-line/50 bg-panel-muted text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "mb-1 block text-[0.68rem] font-semibold uppercase tracking-wider",
                          message.role === "user" ? "text-white/75" : "text-muted-soft",
                        )}
                      >
                        {message.role === "user" ? "You" : "AI coach"}
                      </span>
                      {message.content}
                    </div>
                  ))
                ) : roleplayLoading ? null : (
                  <EmptyState
                    title="No roleplay started"
                    description="Start the roleplay to let the AI act inside today's workplace scenario."
                  />
                )}
                {roleplayLoading ? (
                  <div
                    data-motion="message"
                    className="mr-auto flex max-w-[90%] items-center gap-2 rounded-[8px] border border-line/50 bg-panel-muted px-3 py-2.5 text-sm font-semibold text-muted sm:max-w-[88%] sm:px-4 sm:py-3"
                  >
                    <Loader2 className="animate-spin text-brand" size={16} />
                    AI coach is preparing the next turn
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="grid gap-2">
                <FieldLabel htmlFor="speaking-roleplay-answer">Your roleplay answer</FieldLabel>
                <Textarea
                  id="speaking-roleplay-answer"
                  value={roleplayAnswer}
                  onChange={(event) => updateAnswerFromInput("roleplay", event.target.value)}
                  placeholder={`Answer using: ${targetChunkText}`}
                  maxLength={3000}
                  aria-describedby="speaking-roleplay-count"
                />
              </div>
              <VoiceRecorderCard
                title="Voice transcript"
                description="Record in English, then edit the transcript before sending."
                target="roleplay"
                activeTarget={voiceTarget}
                messageTarget={voiceMessageTarget}
                status={voiceStatus}
                error={voiceError}
                draft={voiceDrafts.roleplay}
                disabled={roleplayLoading}
                onStart={() => startVoiceInput("roleplay")}
                onStop={stopVoiceInput}
              />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p id="speaking-roleplay-count" className="text-sm text-[var(--muted)]">{roleplayAnswer.length}/3000 characters</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    id="speaking-feedback-action"
                    variant="secondary"
                    onClick={requestFeedback}
                    disabled={feedbackLoading || !lastLearnerAnswer}
                    icon={
                      feedbackLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <PenLine size={16} />
                      )
                    }
                  >
                    Get Feedback
                  </Button>
                  <Button
                    id="speaking-send-action"
                    onClick={sendRoleplayAnswer}
                    disabled={roleplayLoading || !roleplayAnswer.trim()}
                    icon={
                      roleplayLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )
                    }
                  >
                    Send
                  </Button>
                </div>
              </div>
            </div>

            {error ? (
              <div className="mt-4 rounded-[8px] border border-[#f0c7bd] bg-[#fff7f4] p-3 text-sm leading-6 text-[#7b3f34] sm:p-4">
                {error}
              </div>
            ) : null}
            {persistenceStatus ? (
              <div
                className={`mt-4 rounded-[8px] border p-3 text-sm leading-6 sm:p-4 ${
                  persistenceStatus.saved
                    ? "border-brand/20 bg-brand/[0.06] text-brand"
                    : "border-[#f1d4a8] bg-[#fff9ed] text-[#7a4b12]"
                }`}
              >
                {getPersistenceMessage(persistenceStatus)}
              </div>
            ) : null}
          </Panel>
        </div>
      )}

      {activeTab === "feedback" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-feedback" aria-labelledby="tab-feedback">
          <Panel>
            <div id="speaking-feedback-panel" className="flex items-center gap-3">
              <PenLine size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Feedback</h2>
            </div>

            {feedbackLoading ? (
              <div className="mt-5">
                <Loader2 className="animate-spin text-brand mx-auto" size={28} />
                <p className="text-center text-sm text-muted mt-2">AI Coach is evaluating your response...</p>
              </div>
            ) : feedback ? (
              <div className="mt-4 space-y-4 text-sm leading-6 sm:mt-5 sm:space-y-5">
                <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-center md:gap-4">
                  <ProgressRing
                    value={feedbackAverage ?? 0}
                    max={5}
                    size={112}
                    stroke={9}
                    label="Average"
                    detail={feedbackAverage !== null ? `${feedbackAverage}/5` : "--"}
                    tone={feedbackAverageTone?.tone ?? "brand"}
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={feedbackAverageTone?.tone ?? "brand"}>
                        {feedbackAverageTone?.label ?? "Feedback ready"}
                      </Badge>
                      <Badge tone="violet">AI coach</Badge>
                    </div>
                    <h3 className="mt-3 text-base font-semibold sm:text-lg">Rubric signal</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {feedback.mainIssue}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {scoreLabels.map((score) => (
                    <FeedbackScoreCard
                      key={score.key}
                      label={score.label}
                      value={feedback.scores[score.key]}
                    />
                  ))}
                </div>

                <div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <h3 className="font-semibold">Better answer</h3>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant="secondary"
                        onClick={() => speakText(feedback.betterAnswer, "betterAnswer", "better answer")}
                        disabled={speechTarget !== null}
                        icon={
                          speechTarget === "betterAnswer" ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Volume2 size={16} />
                          )
                        }
                      >
                        {speechTarget === "betterAnswer" ? "Playing" : "Listen"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          updateAnswerFromInput("retry", feedback.betterAnswer);
                          changeTab("retry");
                          focusElementSoon("speaking-retry-answer");
                        }}
                        icon={<Repeat2 size={16} />}
                      >
                        Shadow
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={stopSpeech}
                        disabled={speechTarget !== "betterAnswer"}
                        icon={<Square size={16} />}
                      >
                        Stop
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 rounded-[8px] bg-panel-muted p-3 text-sm leading-6 sm:p-4">
                    {feedback.betterAnswer}
                  </p>
                  {speechStatus || speechError ? (
                    <p className={cn("mt-2 text-sm", speechError ? "text-danger-text" : "text-brand")}>
                      {speechError ?? speechStatus}
                    </p>
                  ) : null}
                </div>

                <div>
                  <h3 className="font-semibold">Evidence</h3>
                  <ul className="mt-2 grid gap-2">
                    {feedback.evidence.map((item) => (
                      <li key={item} className="rounded-[8px] bg-panel-muted p-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <DeliverySignalsPanel
                  title="Delivery signals"
                  signals={feedback.deliverySignals}
                  metrics={lastLearnerDelivery?.voiceMetrics ?? null}
                />

                <div className="rounded-[8px] border border-line/60 bg-white p-3 sm:p-4">
                  <h3 className="font-semibold">Retry task</h3>
                  <p className="mt-2">{feedback.retryTask.prompt}</p>
                  <p className="mt-3 text-[var(--muted)]">
                    Required: {feedback.retryTask.requiredChunks.join(", ")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No feedback yet"
                  description="Send at least one roleplay answer, then get feedback for your latest answer."
                />
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "retry" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-retry" aria-labelledby="tab-retry">
          <Panel>
            <div className="flex items-center gap-3">
              <Target size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Retry</h2>
            </div>

            {feedback ? (
              <div className="mt-4 grid gap-2.5 sm:mt-5 sm:gap-3">
                <div className="rounded-[8px] border border-line/60 bg-panel-muted p-3 text-sm leading-6 sm:p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={feedbackAverageTone?.tone ?? "brand"}>
                          {feedbackAverage !== null ? `${feedbackAverage}/5 average` : "Feedback ready"}
                        </Badge>
                        <Badge tone="violet">Retry target</Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold sm:text-lg">Rubric signal</h3>
                      <p className="mt-2 text-muted">{feedback.mainIssue}</p>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => changeTab("feedback")}
                      icon={<PenLine size={16} />}
                    >
                      Details
                    </Button>
                  </div>
                </div>
                <p className="rounded-[8px] border border-line/60 bg-white p-3 text-sm leading-6 sm:p-4">
                  {feedback.retryTask.prompt}
                </p>
                <div className="grid gap-2">
                  <FieldLabel htmlFor="speaking-retry-answer">Retry answer</FieldLabel>
                  <Textarea
                    id="speaking-retry-answer"
                    value={retryAnswer}
                    onChange={(event) => updateAnswerFromInput("retry", event.target.value)}
                    placeholder={`Rewrite your answer using: ${feedback.retryTask.requiredChunks.join(", ")}`}
                    maxLength={3000}
                    aria-describedby="speaking-retry-count"
                  />
                </div>
                <VoiceRecorderCard
                  title="Retry by voice"
                  description="Record your improved answer, review the transcript, then check retry."
                  target="retry"
                  activeTarget={voiceTarget}
                  messageTarget={voiceMessageTarget}
                  status={voiceStatus}
                  error={voiceError}
                  draft={voiceDrafts.retry}
                  disabled={retryLoading}
                  onStart={() => startVoiceInput("retry")}
                  onStop={stopVoiceInput}
                />
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p id="speaking-retry-count" className="text-sm text-[var(--muted)]">{retryAnswer.length}/3000 characters</p>
                  <Button
                    id="speaking-retry-action"
                    onClick={submitRetry}
                    disabled={retryLoading || !retryAnswer.trim()}
                    icon={
                      retryLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )
                    }
                  >
                    Check Retry
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Retry locked"
                  description="Get feedback first so the retry has a clear target."
                />
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "review" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-review" aria-labelledby="tab-review">
          <Panel>
            <div className="flex items-center gap-3">
              <Sparkles size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Retry & Review</h2>
            </div>

            {retryFeedback ? (
              <div id="speaking-review-panel" tabIndex={-1} className="mt-4 space-y-4 text-sm leading-6 sm:mt-5 sm:space-y-5">
                <RetryImprovementMoment
                  improved={retryFeedback.improved}
                  average={retryAverage}
                  delta={retryDelta}
                  comparison={retryFeedback.comparisonVi}
                />
                <DeliverySignalsPanel
                  title="Retry delivery"
                  signals={retryFeedback.deliverySignals}
                  metrics={lastRetryDelivery?.voiceMetrics ?? null}
                />
                {missionCompleted ? (
                  <MissionCompletionMoment
                    improved={retryFeedback.improved}
                    missionTitle={mission.title}
                    reviewItemsCreated={reviewItemsCreated}
                  />
                ) : null}
                <ResultSection title="Remaining issue" text={retryFeedback.remainingIssue} />
                <ResultSection title="Next action" text={retryFeedback.nextAction} />
                {retryFeedback.reviewCandidates.length ? (
                  <div>
                    <h3 className="font-semibold">Review candidates</h3>
                    <div className="mt-3 grid gap-2">
                      {retryFeedback.reviewCandidates.map((item) => (
                        <div key={`${item.type}-${item.content}`} className="rounded-[8px] bg-panel-muted p-3">
                          <p className="font-semibold capitalize">{item.type}</p>
                          <p className="mt-1">{item.content}</p>
                          {item.correctForm ? (
                            <p className="mt-1 text-[var(--muted)]">Fix: {item.correctForm}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No retry feedback yet"
                  description="Submit your retry to compare it with the first answer."
                />
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}

function ResultSection({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 rounded-[8px] bg-panel-muted p-3 text-sm leading-6 sm:p-4">{text}</p>
    </div>
  );
}

function ShadowingPromptCard({
  question,
  primaryChunk,
  secondaryChunk,
  onListen,
  disabled,
}: {
  question: string;
  primaryChunk: string;
  secondaryChunk?: string;
  onListen: () => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-line/60 bg-white p-3 text-sm sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Badge tone="blue">Shadow</Badge>
          <p className="mt-2 font-semibold">{question}</p>
        </div>
        <Button
          variant="secondary"
          onClick={onListen}
          disabled={disabled}
          icon={<Volume2 size={16} />}
        >
          Listen
        </Button>
      </div>
      <p className="mt-2 leading-6 text-[var(--muted)]">
        Listen once, say it out loud, then answer using {primaryChunk}
        {secondaryChunk ? ` or ${secondaryChunk}` : ""}.
      </p>
    </div>
  );
}

function DeliverySignalsPanel({
  title,
  signals,
  metrics,
}: {
  title: string;
  signals: SpeakingFeedback["deliverySignals"] | SpeakingRetryFeedback["deliverySignals"];
  metrics: SpeakingVoiceMetrics | null;
}) {
  return (
    <div className="rounded-[8px] border border-blue/20 bg-blue/5 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="blue">{title}</Badge>
        <Badge tone="neutral">
          {signals.inputMode === "voice" ? "Voice transcript" : "Typed fallback"}
        </Badge>
        {metrics ? (
          <Badge tone={metrics.attemptLengthSignal === "too_short" ? "amber" : "brand"}>
            {formatAttemptLengthSignal(metrics.attemptLengthSignal)}
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 grid gap-2 text-sm leading-6 sm:grid-cols-2">
        <p className="rounded-[8px] bg-white/80 p-3">{signals.lengthSignal}</p>
        <p className="rounded-[8px] bg-white/80 p-3">{signals.paceSignal}</p>
        <p className="rounded-[8px] bg-white/80 p-3">{signals.transcriptSignal}</p>
        <p className="rounded-[8px] bg-white/80 p-3">{signals.nextVoiceAction}</p>
      </div>
      {metrics ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
          <div className="rounded-[8px] bg-white/80 p-2">
            <p className="font-semibold">{metrics.wordCount}</p>
            <p className="text-muted">words</p>
          </div>
          <div className="rounded-[8px] bg-white/80 p-2">
            <p className="font-semibold">{formatDeliveryMetric(metrics.wordsPerMinute ?? null, " WPM")}</p>
            <p className="text-muted">pace</p>
          </div>
          <div className="rounded-[8px] bg-white/80 p-2">
            <p className="font-semibold">{metrics.transcriptEdited ? "Edited" : "Raw"}</p>
            <p className="text-muted">transcript</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeedbackScoreCard({ label, value }: { label: string; value: number }) {
  const tone = getScoreTone(value);

  return (
    <div
      data-motion="score"
      className={cn("rounded-[8px] border p-3", tone.card)}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">{label}</p>
          <p className={cn("mt-1 text-xl font-semibold sm:text-2xl", tone.text)}>{value}/5</p>
        </div>
        <Badge tone={tone.tone}>{tone.label}</Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80">
        <div
          className={cn("h-full rounded-full", tone.bar)}
          style={{ width: `${Math.max(value, 0) * 20}%` }}
        />
      </div>
    </div>
  );
}

function RetryImprovementMoment({
  improved,
  average,
  delta,
  comparison,
}: {
  improved: boolean;
  average: number | null;
  delta: number | null;
  comparison: string;
}) {
  const tone = improved ? "brand" : "amber";

  return (
    <div
      data-motion={improved ? "completion" : "score"}
      className={cn(
        "rounded-card border p-3 sm:p-4",
        improved
          ? "border-brand/25 bg-brand/5 shadow-[var(--shadow-glow-brand)]"
          : "border-warning-line bg-warning-surface shadow-[var(--shadow-glow-warning)]",
      )}
    >
      <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-center md:gap-4">
        <ProgressRing
          value={average ?? 0}
          max={5}
          size={104}
          stroke={9}
          label="Retry"
          detail={average !== null ? `${average}/5` : "--"}
          tone={tone}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={tone} icon={improved ? <Award size={13} /> : <Target size={13} />}>
              {improved ? "Improved" : "Keep shaping"}
            </Badge>
            {delta !== null ? (
              <Badge tone={delta > 0 ? "brand" : delta < 0 ? "coral" : "neutral"}>
                {formatDelta(delta)} avg
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold sm:text-lg">
            {improved ? "Retry landed better" : "Retry needs one more pass"}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">{comparison}</p>
        </div>
      </div>
    </div>
  );
}

function MissionCompletionMoment({
  improved,
  missionTitle,
  reviewItemsCreated,
}: {
  improved: boolean;
  missionTitle: string;
  reviewItemsCreated: number;
}) {
  return (
    <div
      data-motion="completion"
      className="rounded-card border border-brand/25 bg-[var(--surface-success)] p-3.5 shadow-[var(--shadow-glow-brand)] sm:p-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="grid grid-cols-[auto_1fr] gap-2.5 sm:gap-3">
          <span className="flex size-9 items-center justify-center rounded-control bg-brand text-white sm:size-10">
            <Sparkles size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="brand">Mission complete</Badge>
              <Badge tone={improved ? "brand" : "amber"}>
                {improved ? "Improved retry" : "Checkpoint saved"}
              </Badge>
            </div>
            <h3 className="mt-3 text-base font-semibold sm:text-lg">{missionTitle} saved</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              {reviewItemsCreated > 0
                ? `${reviewItemsCreated} item(s) moved into review so the weak spots come back at the right time.`
                : "The attempt is saved. Open review when you want to reinforce the useful chunks."}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          <LinkButton href="/review" icon={<ArrowRight size={16} />}>
            Review
          </LinkButton>
          <LinkButton href="/progress" variant="secondary" icon={<ArrowRight size={16} />}>
            Progress
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function VoiceRecorderCard({
  title,
  description,
  target,
  activeTarget,
  messageTarget,
  status,
  error,
  draft,
  disabled,
  onStart,
  onStop,
}: {
  title: string;
  description: string;
  target: VoiceTarget;
  activeTarget: VoiceTarget | null;
  messageTarget: VoiceTarget | null;
  status: string | null;
  error: string | null;
  draft: VoiceDraft;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  const isListening = activeTarget === target;
  const scopedStatus = messageTarget === target ? status : null;
  const scopedError = messageTarget === target ? error : null;
  const hasTranscript = draft.state === "transcript-ready" || draft.state === "edited" || draft.state === "submitted";
  const badgeTone: "brand" | "blue" | "coral" | "neutral" = scopedError
    ? "coral"
    : isListening
      ? "blue"
      : hasTranscript
        ? "brand"
        : "neutral";
  const badgeLabel = scopedError
    ? scopedError.includes("not supported")
      ? "Unavailable"
      : "Needs attention"
    : isListening
      ? "Listening"
      : draft.state === "edited"
        ? "Edited"
        : draft.state === "submitted"
          ? "Submitted"
          : hasTranscript
            ? "Transcript ready"
            : draft.state === "unsupported"
              ? "Unavailable"
              : "Ready";

  return (
    <div
      role="group"
      aria-label={title}
      className={cn(
        "rounded-card border p-3 transition-all duration-[var(--motion-component)]",
        isListening && "border-blue/30 bg-blue/5 shadow-[var(--shadow-glow-insight)]",
        scopedError && "border-danger-line bg-danger-surface shadow-[var(--shadow-glow-danger)]",
        !isListening && !scopedError && "border-line/60 bg-panel-muted",
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <span
            className={cn(
              "flex size-10 items-center justify-center rounded-control border bg-white text-muted",
              isListening && "animate-pulse border-blue/30 text-blue",
              hasTranscript && "border-brand/20 text-brand",
              scopedError && "border-danger-line text-danger-text",
            )}
            aria-hidden="true"
          >
            <Mic size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{title}</p>
              <Badge tone={badgeTone}>{badgeLabel}</Badge>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={onStart}
            disabled={Boolean(activeTarget) || disabled}
            icon={isListening ? <Loader2 className="animate-spin" size={16} /> : <Mic size={16} />}
          >
            {isListening ? "Listening" : "Record"}
          </Button>
          <Button
            variant="secondary"
            onClick={onStop}
            disabled={!isListening}
            icon={<Square size={16} />}
          >
            Stop
          </Button>
        </div>
      </div>
      {messageTarget === target && (status || error) ? (
        <p
          className={cn("mt-3 text-sm leading-6", scopedError ? "text-danger-text" : "text-brand")}
          role={scopedError ? "alert" : "status"}
          aria-live={scopedError ? "assertive" : "polite"}
          aria-atomic="true"
        >
          {scopedError ?? scopedStatus}
        </p>
      ) : null}
      {draft.inputMode === "voice" && draft.state !== "listening" ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
          <div className="rounded-[8px] bg-white/80 p-2">
            <p className="font-semibold">{draft.wordCount}</p>
            <p className="text-muted">words</p>
          </div>
          <div className="rounded-[8px] bg-white/80 p-2">
            <p className="font-semibold">{formatDeliveryMetric(draft.wordsPerMinute, " WPM")}</p>
            <p className="text-muted">pace</p>
          </div>
          <div className="rounded-[8px] bg-white/80 p-2">
            <p className="font-semibold">{draft.transcriptEdited ? "Edited" : "Raw"}</p>
            <p className="text-muted">transcript</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
