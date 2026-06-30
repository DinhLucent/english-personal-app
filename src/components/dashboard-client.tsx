"use client";

import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Mic,
  PenLine,
  Sparkles,
  Target,
  BarChart3,
  WandSparkles,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  LinkButton,
  PageHeader,
  Panel,
  ProgressRing,
  StatBlock,
  Stepper,
  type StepperStep,
} from "@/components/ui";
import { PageTabs, useTabSync } from "@/components/page-tabs";

import type { ProgressSummary } from "@/lib/progress";
import type { CurrentMissionResolution } from "@/lib/mission-resolver";
import type { SpeakingMission } from "@/lib/missions";
import type { AdaptiveMissionRecommendation } from "@/lib/adaptive-mission";

interface DashboardClientProps {
  summary: ProgressSummary;
  missionResolution: CurrentMissionResolution;
  missionPath: SpeakingMission[];
  adaptiveRecommendation: AdaptiveMissionRecommendation;
}

const missionStepCopy: Record<string, { label: string; detail: string }> = {
  prepare: {
    label: "Prepare",
    detail: "Read the workplace context and useful chunks.",
  },
  drill: {
    label: "Drill",
    detail: "Say the target phrases before the roleplay.",
  },
  roleplay: {
    label: "Roleplay",
    detail: "Answer the mission prompt in context.",
  },
  feedback: {
    label: "Feedback",
    detail: "Get rubric notes from the AI coach.",
  },
  retry: {
    label: "Retry",
    detail: "Improve one weak part of your answer.",
  },
  review: {
    label: "Review",
    detail: "Save chunks and errors for spaced review.",
  },
};

export function DashboardClient({
  summary,
  missionResolution,
  missionPath,
  adaptiveRecommendation,
}: DashboardClientProps) {
  const currentMission = missionResolution.mission;
  const completedMissions = Math.min(
    missionResolution.completedMissions,
    missionResolution.totalMissions,
  );
  const missionIsComplete = completedMissions >= currentMission.dayNumber;
  const missionSteps: StepperStep[] = currentMission.steps.map((step: string, index: number) => {
    const copy = missionStepCopy[step] || { label: step, detail: "" };

    return {
      id: step,
      label: copy.label,
      detail: copy.detail,
      status: missionIsComplete ? "complete" : index === 0 ? "active" : "pending",
    };
  });
  const missionsRemaining = Math.max(missionResolution.totalMissions - completedMissions, 0);
  const averageScoreLabel = summary.averageScore !== null ? String(summary.averageScore) : "--";
  const lastVoiceLabel = summary.voiceConsistency.lastVoiceAttemptAt
    ? new Date(summary.voiceConsistency.lastVoiceAttemptAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "Not yet";

  const dashboardStats = [
    {
      label: "Path position",
      value: `Day ${missionResolution.dayNumber}`,
      detail: `${missionResolution.totalMissions}-day speaking path`,
      tone: "brand",
    },
    {
      label: "Streak",
      value: summary.completedLessons > 0 ? "1+" : "0",
      detail: "Based on completed lessons",
      tone: "coral",
    },
    { label: "Minutes", value: String(summary.totalMinutes), detail: "Tracked practice", tone: "amber" },
    { label: "Average score", value: averageScoreLabel, detail: "Lessons and sessions", tone: "violet" },
  ];

  const tabItems = [
    { id: "today", label: "Today", icon: <BookOpenCheck size={16} /> },
    { id: "path", label: "Path", icon: <Target size={16} /> },
    { id: "coach", label: "Coach", icon: <WandSparkles size={16} /> },
    { id: "stats", label: "Stats", icon: <BarChart3 size={16} /> },
    { id: "tools", label: "Tools", icon: <Sparkles size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("today", ["today", "path", "coach", "stats", "tools"]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Mission cockpit"
        description="Start with one focused workplace speaking mission, see the next action, then use supporting tools only when a weak spot appears."
        action={
          <LinkButton href={`/speaking?mission=${currentMission.id}`} icon={<BookOpenCheck size={18} />}>
            Start Mission
          </LinkButton>
        }
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "today" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-today" aria-labelledby="tab-today">
          <Panel className="overflow-hidden bg-[linear-gradient(135deg,var(--surface-panel-soft)_0%,var(--surface-panel)_58%,var(--surface-brand-soft)_100%)]">
            <div className="grid gap-6 xl:grid-cols-[auto_1fr_0.72fr] xl:items-center">
              <div className="flex items-center justify-center xl:justify-start">
                <ProgressRing
                  value={missionResolution.dayNumber}
                  max={missionResolution.totalMissions}
                  size={132}
                  stroke={10}
                  label={`Day ${missionResolution.dayNumber}`}
                  detail={`of ${missionResolution.totalMissions}`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand" icon={<Target size={13} />}>
                    Workplace mission
                  </Badge>
                  <Badge tone="blue" icon={<Clock3 size={13} />}>
                    {currentMission.estimatedMinutes} min
                  </Badge>
                  <Badge tone="blue" icon={<Mic size={13} />}>
                    Voice-ready
                  </Badge>
                  <Badge tone={missionIsComplete ? "brand" : "amber"}>
                    {missionIsComplete ? "Complete" : `${missionsRemaining} missions left`}
                  </Badge>
                </div>
                <h2 className="mt-4 text-2xl font-semibold leading-tight md:text-3xl">
                  {currentMission.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted md:text-base">
                  {currentMission.goal}
                </p>
                <div className="mt-5 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                  <p className="border-l-2 border-brand/30 pl-3 leading-6 text-foreground">
                    {currentMission.scenario}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <LinkButton
                      href={`/speaking?mission=${currentMission.id}`}
                      icon={<BookOpenCheck size={18} />}
                    >
                      Start today
                    </LinkButton>
                    <LinkButton href="/review" variant="secondary" icon={<ArrowRight size={18} />}>
                      Review queue
                    </LinkButton>
                  </div>
                </div>
              </div>

              <aside className="border-t border-line/70 pt-5 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-violet/10 text-violet">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-soft">
                      Coach signal
                    </p>
                    <p className="text-sm font-semibold">{adaptiveRecommendation.weakSkillLabel}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted">
                  {adaptiveRecommendation.reason}
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">
                  {adaptiveRecommendation.focus}
                </p>
                <p className="mt-3 rounded-[8px] border border-blue/20 bg-blue/5 p-3 text-sm leading-6 text-muted">
                  Voice habit: {summary.voiceConsistency.voiceAttempts} spoken attempt(s), last voice practice {lastVoiceLabel}.
                </p>
              </aside>
            </div>

            <div className="mt-6 border-t border-line/70 pt-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-soft">
                    Speaking flow
                  </p>
                  <h3 className="mt-1 text-lg font-semibold">Today&apos;s learning timeline</h3>
                </div>
                {missionResolution.reason ? (
                  <p className="max-w-xl text-sm leading-6 text-muted">{missionResolution.reason}</p>
                ) : null}
              </div>
              <Stepper steps={missionSteps} className="mt-4 md:grid-cols-2 xl:grid-cols-6" />
            </div>
          </Panel>

          <Panel className="border-blue/20 bg-blue/5">
            <div className="grid gap-4 md:grid-cols-[auto_1fr_auto] md:items-center">
              <span className="flex size-11 items-center justify-center rounded-control bg-blue text-white">
                <Mic size={20} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="blue">Voice Coach</Badge>
                  <Badge tone="neutral">Listen, shadow, speak, retry</Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold">Make today&apos;s mission a spoken rep</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Use browser voice transcript, edit before submitting, then compare delivery signals after feedback. No audio is stored.
                </p>
              </div>
              <LinkButton href={`/speaking?mission=${currentMission.id}`} icon={<Mic size={18} />}>
                Start voice mission
              </LinkButton>
            </div>
          </Panel>

          <div className="grid items-start gap-4 lg:grid-cols-[0.82fr_1.18fr]">
            <Panel className="h-fit">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-brand">
                    Mission materials
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">Roleplay brief</h2>
                  <p className="mt-1 text-sm text-muted">
                    Read the situation once, then open the studio when you are ready to answer.
                  </p>
                </div>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-brand/[0.08] text-brand">
                  <Target size={20} />
                </span>
              </div>

              <div className="mt-5 border-l-2 border-brand/30 pl-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-soft">
                  Roleplay
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {currentMission.roleplayPrompt}
                </p>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <LinkButton href={`/speaking?mission=${currentMission.id}`} icon={<BookOpenCheck size={18} />}>
                  Open Studio
                </LinkButton>
                <LinkButton href="/conversation" variant="secondary" icon={<MessageSquare size={18} />}>
                  Practice Dialogue
                </LinkButton>
              </div>
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-brand">
                  Target chunks
                </p>
                <h2 className="mt-1 text-xl font-semibold">Chunks to use today</h2>
                <p className="mt-1 text-sm text-muted">
                  Keep these phrases ready before starting the roleplay.
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-brand/[0.08] text-brand">
                <Target size={20} />
              </span>
            </div>

              <div className="mt-5 divide-y divide-line/70 border-y border-line/70">
                {currentMission.targetChunks.slice(0, 3).map((chunk) => (
                  <div key={chunk.text} className="py-3 text-sm">
                    <p className="font-semibold">{chunk.text}</p>
                    <p className="mt-1 text-muted">{chunk.meaningVi}</p>
                    <p className="mt-2 leading-6">{chunk.example}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {activeTab === "path" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-path" aria-labelledby="tab-path">
          <Panel>
            <h2 className="text-lg font-semibold">30-day speaking path</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Move from survival workplace English into interaction, collaboration, and confident speaking.
            </p>
            <div className="mt-5 grid max-h-[720px] gap-2 overflow-y-auto pr-1">
              {missionPath.map((mission) => {
                const completed = mission.dayNumber <= completedMissions;
                const active = mission.dayNumber === currentMission.dayNumber;

                return (
                  <div
                    key={mission.id}
                    className={`grid grid-cols-[auto_1fr] items-start gap-3 rounded-[8px] border px-3 py-3 text-sm ${
                      active
                        ? "border-brand/40 bg-brand/[0.06]"
                        : "border-line/60 bg-white/70"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-[8px] text-xs font-semibold ${
                        completed
                          ? "bg-brand text-white"
                          : active
                            ? "bg-white text-brand"
                            : "bg-panel-muted text-[var(--muted)]"
                      }`}
                    >
                      {completed ? <CheckCircle2 size={15} /> : mission.dayNumber}
                    </span>
                    <span>
                      <span className="font-semibold">{mission.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-[var(--muted)]">
                        {mission.goal}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "coach" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-coach" aria-labelledby="tab-coach">
          <Panel className="overflow-hidden bg-[linear-gradient(135deg,var(--surface-panel-soft)_0%,var(--surface-panel)_62%,rgba(85,87,198,0.08)_100%)]">
            <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
              <div className="flex justify-center xl:justify-start">
                <span className="flex size-24 items-center justify-center rounded-panel border border-line/70 bg-panel-muted text-brand sm:size-28">
                  <Sparkles size={30} />
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="violet">Adaptive coach</Badge>
                  <Badge tone="coral">{adaptiveRecommendation.weakSkillLabel}</Badge>
                </div>
                <h2 className="mt-3 text-xl font-semibold leading-tight sm:text-2xl">
                  {adaptiveRecommendation.mission.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{adaptiveRecommendation.reason}</p>
                <p className="mt-3 border-l-2 border-violet/30 pl-3 text-sm leading-6 text-foreground">
                  {adaptiveRecommendation.focus}
                </p>
                <p className="mt-3 rounded-[8px] border border-blue/20 bg-blue/5 p-3 text-sm leading-6 text-muted">
                  Voice habit: {summary.voiceConsistency.voiceAttempts} spoken attempt(s), last voice practice {lastVoiceLabel}.
                </p>
              </div>
              <div className="flex shrink-0 flex-col gap-3">
                <LinkButton
                  href={`/speaking?mission=${adaptiveRecommendation.mission.id}`}
                  icon={<ArrowRight size={18} />}
                >
                  Practice Focus
                </LinkButton>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "stats" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-stats" aria-labelledby="tab-stats">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardStats.map((stat) => (
              <StatBlock
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
                tone={stat.tone as "brand" | "coral" | "amber" | "violet"}
              />
            ))}
          </div>

          <Panel>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Weekly minutes</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  This chart combines lesson attempts and practice sessions.
                </p>
              </div>
              <LinkButton href="/progress" variant="secondary" icon={<ArrowRight size={18} />}>
                View Progress
              </LinkButton>
            </div>
            <div className="mt-6 grid grid-cols-7 items-end gap-2">
              {summary.weeklyMinutes.map((item, idx: number) => (
                <div key={item.day} className="grid gap-2 text-center">
                  <div className="flex h-32 items-end rounded-[8px] bg-panel-muted/80 p-1 shadow-inner">
                    <div
                      className="w-full rounded-[6px] bg-gradient-to-t from-brand to-[#2ea27e] animate-growUp"
                      style={{
                        height: `${Math.max(item.minutes * 2, 6)}px`,
                        animationDelay: `${idx * 50 + 400}ms`,
                        animationFillMode: "both",
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-[var(--muted)]">{item.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <EmptyState
                title="No sessions completed yet"
                description="Complete lessons and practice sessions to populate your personal progress."
              />
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "tools" && (
        <div className="space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-tools" aria-labelledby="tab-tools">
          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Supporting tools</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Use these when the mission exposes a weak spot.
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-panel-muted text-brand">
                <Sparkles size={19} />
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                { label: "Daily lesson", detail: "Prepare vocabulary, chunks, and prompts.", icon: BookOpenCheck, href: "/daily" },
                { label: "Correction", detail: "Fix a paragraph or answer before retry.", icon: PenLine, href: "/correction" },
                { label: "Conversation", detail: "Use the mission topic in dialogue.", icon: MessageSquare, href: "/conversation" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    data-motion="row"
                    className="group grid gap-3 rounded-[8px] border border-line/60 bg-white/80 p-4 text-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-white hover:shadow-[0_12px_28px_rgba(22,33,29,0.065)] active:translate-y-0 active:scale-[0.99]"
                    href={item.href}
                    key={item.href}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-brand/[0.08] text-brand">
                      <Icon size={18} />
                    </span>
                    <span>
                      <span className="font-semibold">{item.label}</span>
                      <span className="mt-1 block leading-6 text-[var(--muted)]">{item.detail}</span>
                    </span>
                  </a>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
