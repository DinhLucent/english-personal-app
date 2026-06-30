"use client";

import { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Gauge,
  MessageSquare,
  Mic,
  PenLine,
  Repeat2,
  Sparkles,
  Target,
} from "lucide-react";
import {
  Badge,
  EmptyState,
  LinkButton,
  PageHeader,
  Panel,
  ProgressRing,
  StatBlock,
  cn,
} from "@/components/ui";
import { PageTabs, useTabSync } from "@/components/page-tabs";
import type { ProgressSummary, RubricSkillProgress, RubricTrendPoint } from "@/lib/progress";
import type { AdaptiveMissionRecommendation } from "@/lib/adaptive-mission";

interface ProgressClientProps {
  summary: ProgressSummary;
  adaptiveRecommendation: AdaptiveMissionRecommendation;
}

const activitySources = [
  { label: "Vocabulary", getValue: (summary: ProgressSummary) => summary.vocabularyItems, icon: Sparkles },
  { label: "Corrections", getValue: (summary: ProgressSummary) => summary.corrections, icon: PenLine },
  { label: "Conversations", getValue: (summary: ProgressSummary) => summary.conversations, icon: MessageSquare },
  { label: "Lessons", getValue: (summary: ProgressSummary) => summary.completedLessons, icon: CheckCircle2 },
];

const skillIcons: Record<string, typeof Target> = {
  taskCompletion: Target,
  fluency: Gauge,
  accuracy: PenLine,
  vocabulary: Sparkles,
  interaction: MessageSquare,
};

function formatScore(score: number | null) {
  return score === null ? "--" : score.toFixed(score % 1 === 0 ? 0 : 1);
}

function getScoreTone(score: number | null) {
  if (score === null) {
    return {
      label: "No data",
      badgeTone: "neutral" as const,
      ringTone: "brand" as const,
      frame: "border-line/70 bg-white",
      text: "text-muted",
      bar: "bg-panel-muted",
      iconBox: "bg-panel-muted text-muted",
    };
  }

  if (score >= 4) {
    return {
      label: "Strong",
      badgeTone: "brand" as const,
      ringTone: "brand" as const,
      frame: "border-brand/20 bg-brand/5",
      text: "text-brand",
      bar: "bg-brand",
      iconBox: "bg-brand/10 text-brand",
    };
  }

  if (score >= 3) {
    return {
      label: "Developing",
      badgeTone: "amber" as const,
      ringTone: "amber" as const,
      frame: "border-warning-line bg-warning-surface",
      text: "text-warning-text",
      bar: "bg-warning-text",
      iconBox: "bg-warning-surface text-warning-text",
    };
  }

  return {
    label: "Focus",
    badgeTone: "coral" as const,
    ringTone: "coral" as const,
    frame: "border-danger-line bg-danger-surface",
    text: "text-danger-text",
    bar: "bg-danger-text",
    iconBox: "bg-danger-surface text-danger-text",
  };
}

function formatDelta(delta: number | null) {
  if (delta === null) return "No prior score";
  if (delta === 0) return "No change";

  return `${delta > 0 ? "+" : ""}${delta.toFixed(delta % 1 === 0 ? 0 : 1)} latest`;
}

function formatWpm(value: number | null) {
  return value === null ? "--" : String(value);
}

function getWpmBandLabel(band: string) {
  if (band === "slow") return "Slow and clear";
  if (band === "steady") return "Steady";
  if (band === "fast") return "Fast";
  return "No voice data";
}

function averageScores(scores: Record<string, number | null>) {
  const values = Object.values(scores).filter((score): score is number => score !== null);

  if (!values.length) return null;

  return Math.round((values.reduce((sum, score) => sum + score, 0) / values.length) * 10) / 10;
}

export function ProgressClient({
  summary,
  adaptiveRecommendation,
}: ProgressClientProps) {
  const progressStats = [
    {
      label: "Rubric average",
      value: `${formatScore(summary.rubricAverage)}/5`,
      detail: summary.rubricTrend.length ? "From speaking attempts" : "Waiting for scored speaking",
      tone: "brand",
    },
    {
      label: "Speaking attempts",
      value: String(summary.speakingAttempts),
      detail: "Roleplay and retry answers",
      tone: "violet",
    },
    {
      label: "Completed missions",
      value: String(summary.completedMissions),
      detail: "Mission attempts finished",
      tone: "amber",
    },
    {
      label: "Due reviews",
      value: String(summary.dueReviewItems),
      detail: "Items ready to review",
      tone: "coral",
    },
  ];

  const tabItems = [
    { id: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { id: "skills", label: "Skills", icon: <Target size={16} /> },
    { id: "trend", label: "Trend", icon: <Repeat2 size={16} /> },
    { id: "voice", label: "Voice", icon: <Mic size={16} /> },
    { id: "activity", label: "Activity", icon: <Clock size={16} /> },
  ];

  const [activeTab, changeTab] = useTabSync("overview", ["overview", "skills", "trend", "voice", "activity"]);

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Progress"
        title="Speaking progress by rubric"
        description="Track task completion, fluency, accuracy, vocabulary, and interaction from mission feedback instead of only activity counts."
      />

      <PageTabs tabs={tabItems} activeTab={activeTab} onChange={changeTab} />

      {activeTab === "overview" && (
        <div className="space-y-5 md:space-y-6 animate-fadeIn" role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-overview">
          <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
            {progressStats.map((stat) => (
              <StatBlock
                key={stat.label}
                label={stat.label}
                value={stat.value}
                detail={stat.detail}
                tone={stat.tone as "brand" | "coral" | "amber" | "violet"}
              />
            ))}
          </div>

          {summary.reason ? (
            <div className="rounded-card border border-warning-line bg-warning-surface p-4 text-sm leading-6 text-warning-text">
              Some speaking progress data is not available yet: {summary.reason}
            </div>
          ) : null}

          <CoachCallout
            recommendation={adaptiveRecommendation}
            rubricAverage={summary.rubricAverage}
            weakestSkill={summary.weakestSkill}
          />
        </div>
      )}

      {activeTab === "skills" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-skills" aria-labelledby="tab-skills">
          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <Target size={20} className="text-brand" />
                <h2 className="text-lg font-semibold">Rubric skills</h2>
              </div>
              {summary.rubricTrend.length ? (
                <Badge tone="brand">{summary.rubricTrend.length} recent signal(s)</Badge>
              ) : null}
            </div>

            {summary.rubricTrend.length ? (
              <div className="mt-4 grid gap-3 md:mt-5 md:gap-4">
                {summary.rubricSkills.map((skill) => (
                  <RubricSkillCard key={skill.key} skill={skill} />
                ))}
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No rubric scores yet"
                  description="Complete a Speaking Studio feedback and retry cycle to populate speaking skill progress."
                />
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === "trend" && (
        <div className="grid gap-3 md:gap-4 xl:grid-cols-[1fr_0.9fr] animate-fadeIn" role="tabpanel" id="tabpanel-trend" aria-labelledby="tab-trend">
          <Panel>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 size={20} className="text-brand" />
                <h2 className="text-lg font-semibold">Recent trend</h2>
              </div>
              {summary.rubricTrend.length ? (
                <Badge tone="violet">Rubric timeline</Badge>
              ) : null}
            </div>
            {summary.rubricTrend.length ? (
              <div className="mt-4 grid gap-3 md:mt-5 md:gap-4">
                <TrendSparkline points={summary.rubricTrend} />
                <div className="grid gap-3">
                  {summary.rubricTrend.map((point) => (
                    <TrendPointCard key={point.id} point={point} skills={summary.rubricSkills} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="No trend yet"
                  description="Trend appears after roleplay or retry feedback has rubric scores."
                />
              </div>
            )}
          </Panel>

          <Panel className="h-fit">
            <h2 className="text-lg font-semibold">Coach signal</h2>
            <div className="mt-4 grid gap-3 md:mt-5">
              <CoachSignal
                icon={<Sparkles size={18} className="text-brand" />}
                label="Strongest"
                value={summary.strongestSkill?.label ?? "Not enough data"}
                tone="brand"
              />
              <CoachSignal
                icon={<Target size={18} className="text-coral" />}
                label="Needs focus"
                value={summary.weakestSkill?.label ?? "Not enough data"}
                tone="coral"
              />
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "voice" && (
        <div className="animate-fadeIn" role="tabpanel" id="tabpanel-voice" aria-labelledby="tab-voice">
          <Panel>
            <div className="flex items-center gap-3">
              <Mic size={20} className="text-blue" />
              <h2 className="text-lg font-semibold">Voice consistency</h2>
            </div>
            <div className="mt-4 grid gap-2.5 md:mt-5 md:gap-3">
              <CoachSignal
                icon={<Mic size={18} className="text-blue" />}
                label="Voice attempts"
                value={String(summary.voiceConsistency.voiceAttempts)}
                tone="brand"
              />
              <CoachSignal
                icon={<Gauge size={18} className="text-brand" />}
                label="Average pace"
                value={`${formatWpm(summary.voiceConsistency.averageWordsPerMinute)} WPM`}
                tone="brand"
              />
              <CoachSignal
                icon={<Repeat2 size={18} className="text-coral" />}
                label="Retry improved"
                value={String(summary.voiceConsistency.retryImprovements)}
                tone="coral"
              />
            </div>
            <p className="mt-4 rounded-card border border-line/70 bg-panel-muted p-3 text-sm leading-6 text-muted">
              {summary.voiceConsistency.voiceAttempts
                ? `${getWpmBandLabel(summary.voiceConsistency.wpmBand)} delivery across ${summary.voiceConsistency.voiceMissions} mission(s). Transcript edits: ${summary.voiceConsistency.transcriptEditRate ?? 0}%.`
                : "Record a Speaking Studio answer to start tracking delivery signals. This is not pronunciation scoring."}
            </p>
          </Panel>
        </div>
      )}

      {activeTab === "activity" && (
        <div className="grid gap-3 md:gap-4 xl:grid-cols-[1.1fr_0.9fr] animate-fadeIn" role="tabpanel" id="tabpanel-activity" aria-labelledby="tab-activity">
          <Panel>
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Weekly minutes</h2>
            </div>
            <WeeklyMinutesChart minutes={summary.weeklyMinutes} />
            <div className="mt-4 rounded-card border border-line/70 bg-panel-muted p-3 text-sm leading-6 text-muted md:mt-5 md:p-4">
              {summary.source === "supabase"
                ? `Total minutes tracked: ${summary.totalMinutes}. Legacy average score: ${summary.averageScore ?? "--"}.`
                : "Complete a mission to populate the progress chart."}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center gap-3">
              <Repeat2 size={20} className="text-brand" />
              <h2 className="text-lg font-semibold">Learning activity</h2>
            </div>
            <div className="mt-4 grid gap-2.5 md:mt-5 md:gap-3">
              {activitySources.map((source) => {
                const Icon = source.icon;
                return (
                  <div key={source.label} className="flex items-center justify-between rounded-card border border-line p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-control bg-brand/10 text-brand">
                        <Icon size={18} />
                      </span>
                      <span className="text-sm font-semibold">{source.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-brand">{source.getValue(summary)}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function CoachCallout({
  recommendation,
  rubricAverage,
  weakestSkill,
}: {
  recommendation: AdaptiveMissionRecommendation;
  rubricAverage: number | null;
  weakestSkill: RubricSkillProgress | null;
}) {
  const weakTone = getScoreTone(recommendation.weakSkillScore);

  return (
    <Panel className="overflow-hidden bg-[linear-gradient(135deg,var(--surface-panel-soft)_0%,var(--surface-panel)_62%,rgba(85,87,198,0.08)_100%)]">
      <div className="grid gap-4 xl:grid-cols-[auto_1fr_auto] xl:items-center">
        <div className="flex justify-center xl:justify-start">
          {recommendation.weakSkillScore !== null ? (
            <ProgressRing
              value={recommendation.weakSkillScore}
              max={5}
              size={104}
              stroke={9}
              label="Focus"
              detail={`${formatScore(recommendation.weakSkillScore)}/5`}
              tone={weakTone.ringTone}
            />
          ) : (
            <span className="flex size-24 items-center justify-center rounded-panel border border-line/70 bg-panel-muted text-brand sm:size-28">
              <Sparkles size={30} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">Adaptive coach</Badge>
            <Badge tone={weakTone.badgeTone}>{recommendation.weakSkillLabel}</Badge>
            {rubricAverage !== null ? <Badge tone="neutral">Overall {formatScore(rubricAverage)}/5</Badge> : null}
          </div>
          <h2 className="mt-3 text-xl font-semibold leading-tight sm:text-2xl">{recommendation.mission.title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">{recommendation.reason}</p>
          <p className="mt-3 border-l-2 border-violet/30 pl-3 text-sm leading-6 text-foreground">
            {recommendation.focus}
          </p>
          {weakestSkill?.delta !== null && weakestSkill?.delta !== undefined ? (
            <p className={cn("mt-3 text-sm font-semibold", weakestSkill.delta >= 0 ? "text-brand" : "text-danger-text")}>
              {formatDelta(weakestSkill.delta)} on {weakestSkill.label.toLowerCase()}.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col gap-3">
          <LinkButton
            href={`/speaking?mission=${recommendation.mission.id}`}
            icon={<ArrowRight size={18} />}
          >
            Practice Focus
          </LinkButton>
          <p className="max-w-60 text-xs leading-5 text-muted">{recommendation.suggestedAction}</p>
        </div>
      </div>
    </Panel>
  );
}

function RubricSkillCard({ skill }: { skill: RubricSkillProgress }) {
  const tone = getScoreTone(skill.average);
  const Icon = skillIcons[skill.key] || Target;
  const width = `${((skill.average ?? 0) / 5) * 100}%`;

  return (
    <div data-motion="score" className={cn("rounded-card border p-3 sm:p-4", tone.frame)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <span className={cn("flex size-10 items-center justify-center rounded-control", tone.iconBox)}>
            <Icon size={18} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{skill.label}</h3>
              <Badge tone={tone.badgeTone}>{tone.label}</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted">{skill.guidance}</p>
          </div>
        </div>
        <div className="text-left md:text-right">
          <p className={cn("text-xl font-semibold sm:text-2xl", tone.text)}>{formatScore(skill.average)}/5</p>
          <p className="mt-1 text-xs font-semibold text-muted">{formatDelta(skill.delta)}</p>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/80 shadow-inner sm:mt-4 sm:h-3">
        <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width }} />
      </div>
      <p className="mt-2 text-xs text-muted">Latest {formatScore(skill.latest)} from {skill.attempts} scored attempt(s)</p>
    </div>
  );
}

function TrendSparkline({ points }: { points: RubricTrendPoint[] }) {
  const values = points.map((point) => averageScores(point.scores)).filter((score): score is number => score !== null);

  if (!values.length) return null;

  const width = 320;
  const height = 104;
  const padding = 14;
  const maxIndex = Math.max(values.length - 1, 1);
  const coordinates = values.map((value, index) => {
    const x = padding + (index / maxIndex) * (width - padding * 2);
    const y = height - padding - (value / 5) * (height - padding * 2);

    return { x, y, value };
  });
  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const latest = values.at(-1) ?? 0;
  const first = values[0] ?? latest;
  const delta = Math.round((latest - first) * 10) / 10;

  return (
    <div data-motion="score" className="rounded-card border border-violet/20 bg-violet/5 p-3 sm:p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <Badge tone="violet">Trend</Badge>
          <h3 className="mt-3 text-base font-semibold sm:text-lg">Recent rubric average</h3>
        </div>
        <div className="text-left md:text-right">
          <p className="text-xl font-semibold text-violet sm:text-2xl">{formatScore(latest)}/5</p>
          <p className={cn("text-xs font-semibold", delta >= 0 ? "text-brand" : "text-danger-text")}>{formatDelta(delta)}</p>
        </div>
      </div>
      <svg className="mt-3 h-24 w-full sm:mt-4 sm:h-28" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recent rubric trend">
        <line x1={padding} x2={width - padding} y1={height - padding} y2={height - padding} stroke="var(--border-line)" strokeWidth="1" />
        <polyline points={linePoints} fill="none" stroke="var(--tone-insight)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
        {coordinates.map((point, index) => (
          <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="4.5" fill="var(--tone-insight)" />
        ))}
      </svg>
    </div>
  );
}

function TrendPointCard({
  point,
  skills,
}: {
  point: RubricTrendPoint;
  skills: RubricSkillProgress[];
}) {
  const average = averageScores(point.scores);
  const tone = getScoreTone(average);

  return (
    <div className="rounded-card border border-line/70 bg-white p-3 text-sm sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={tone.badgeTone}>{formatScore(average)}/5</Badge>
          <p className="font-semibold capitalize">{point.step}</p>
        </div>
        <p className="text-xs text-muted">{new Date(point.createdAt).toLocaleString()}</p>
      </div>
      <div className="mt-3 grid grid-cols-5 gap-1.5 sm:gap-2">
        {skills.map((skill) => {
          const value = point.scores[skill.key];
          const skillTone = getScoreTone(value);

          return (
            <div key={skill.key} data-motion="score" className={cn("rounded-control border p-1.5 text-center sm:p-2", skillTone.frame)}>
              <p className="truncate text-xs font-semibold text-muted">{skill.label.split(" ")[0]}</p>
              <p className={cn("mt-1 font-semibold", skillTone.text)}>{formatScore(value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyMinutesChart({ minutes }: { minutes: Array<{ day: string; minutes: number }> }) {
  const maxMinutes = Math.max(...minutes.map((item) => item.minutes), 1);

  return (
    <div className="mt-4 grid grid-cols-7 items-end gap-1.5 sm:mt-6 sm:gap-2">
      {minutes.map((item, index) => {
        const height = `${Math.max((item.minutes / maxMinutes) * 100, 6)}%`;

        return (
          <div key={item.day} className="grid gap-2 text-center">
            <div className="flex h-28 items-end rounded-card bg-panel-muted p-1 shadow-inner sm:h-36">
              <div
                data-motion="score"
                className="w-full rounded-[6px] bg-gradient-to-t from-brand to-[#2ea27e]"
                style={{ height, transitionDelay: `${index * 35}ms` }}
                title={`${item.minutes} minutes`}
              />
            </div>
            <span className="text-xs font-semibold text-muted">{item.day}</span>
          </div>
        );
      })}
    </div>
  );
}

function CoachSignal({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "brand" | "coral";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-line p-3 text-sm sm:p-4">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-9 items-center justify-center rounded-control", tone === "brand" ? "bg-brand/10" : "bg-danger-surface")}>
          {icon}
        </span>
        <span className="font-semibold">{label}</span>
      </div>
      <span className="text-right text-muted">{value}</span>
    </div>
  );
}
