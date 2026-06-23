import { BarChart3, CheckCircle2, Clock, MessageSquare, PenLine, Sparkles } from "lucide-react";
import { EmptyState, PageHeader, Panel, StatBlock } from "@/components/ui";
import { getProgressSummary } from "@/lib/progress";

const sources = [
  { label: "Lesson attempts", icon: CheckCircle2 },
  { label: "Practice sessions", icon: MessageSquare },
  { label: "Corrections", icon: PenLine },
  { label: "Vocabulary items", icon: Sparkles },
  { label: "Minutes spent", icon: Clock },
];

export default async function ProgressPage() {
  const summary = await getProgressSummary();
  const progressStats = [
    {
      label: "Completed lessons",
      value: String(summary.completedLessons),
      detail: summary.source === "supabase" ? "From lesson attempts" : "Waiting for Supabase",
      tone: "brand",
    },
    {
      label: "Vocabulary learned",
      value: String(summary.vocabularyItems),
      detail: "Saved words",
      tone: "violet",
    },
    {
      label: "Corrections",
      value: String(summary.corrections),
      detail: "History count",
      tone: "coral",
    },
    {
      label: "Conversations",
      value: String(summary.conversations),
      detail: "Finished sessions",
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Progress"
        title="Track learning from real sessions"
        description="Stats are aggregated from lessons, corrections, vocabulary, and conversation sessions in your personal profile."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="flex items-center gap-3">
            <BarChart3 size={20} className="text-brand" />
            <h2 className="text-lg font-semibold">Weekly minutes</h2>
          </div>
          <div className="mt-6 grid grid-cols-7 items-end gap-2">
            {summary.weeklyMinutes.map((item) => (
              <div key={item.day} className="grid gap-2 text-center">
                <div className="flex h-36 items-end rounded-[8px] bg-panel-muted p-1">
                  <div className="w-full rounded-[6px] bg-brand" style={{ height: `${Math.max(item.minutes * 2, 6)}px` }} />
                </div>
                <span className="text-xs font-semibold text-[#66716c]">{item.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <EmptyState
              title={summary.source === "supabase" ? "Connected to Supabase" : "No cloud data yet"}
              description={
                summary.source === "supabase"
                  ? `Total minutes tracked: ${summary.totalMinutes}. Average score: ${summary.averageScore ?? "--"}.`
                  : "Complete a lesson to populate the progress chart."
              }
            />
          </div>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold">Data sources</h2>
          <div className="mt-5 grid gap-3">
            {sources.map((source) => {
              const Icon = source.icon;
              return (
                <div key={source.label} className="flex items-center gap-3 rounded-[8px] border border-line p-4">
                  <Icon size={18} className="text-brand" />
                  <span className="text-sm font-semibold">{source.label}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </div>
  );
}
