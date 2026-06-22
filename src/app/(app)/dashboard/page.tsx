import { ArrowRight, BookOpenCheck, MessageSquare, PenLine } from "lucide-react";
import { EmptyState, LinkButton, PageHeader, Panel, StatBlock } from "@/components/ui";
import { todayTasks } from "@/lib/demo-data";
import { getProgressSummary } from "@/lib/progress";

export default async function DashboardPage() {
  const summary = await getProgressSummary();
  const dashboardStats = [
    { label: "Current day", value: `Day ${Math.min(summary.completedLessons + 1, 30)}`, detail: "30-day plan", tone: "brand" },
    { label: "Streak", value: summary.completedLessons > 0 ? "1+" : "0", detail: "Based on completed lessons", tone: "coral" },
    { label: "Minutes", value: String(summary.totalMinutes), detail: "Tracked practice", tone: "amber" },
    { label: "Average score", value: summary.averageScore ? String(summary.averageScore) : "--", detail: "Lessons and sessions", tone: "violet" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Your English cockpit for today"
        description="Start with one focused lesson, then reinforce it with correction and conversation practice. Cloud progress will unlock after Supabase is connected."
        action={
          <LinkButton href="/daily" icon={<BookOpenCheck size={18} />}>
            Start Today
          </LinkButton>
        }
      />

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

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Today&apos;s tasks</h2>
              <p className="mt-1 text-sm text-[#66716c]">
                MVP flow: lesson, correction, conversation, progress.
              </p>
            </div>
            <ArrowRight size={20} className="text-brand" />
          </div>
          <div className="mt-5 grid gap-3">
            {todayTasks.map((task) => (
              <a
                key={task.href}
                href={task.href}
                className="rounded-[8px] border border-line bg-white p-4 transition hover:border-brand"
              >
                <p className="font-semibold">{task.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#66716c]">{task.detail}</p>
              </a>
            ))}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Practice mix</h2>
          <p className="mt-1 text-sm text-[#66716c]">Balanced daily inputs.</p>
          <div className="mt-6 grid gap-4">
            {[
              { label: "Lesson", icon: BookOpenCheck, href: "/daily" },
              { label: "Correction", icon: PenLine, href: "/correction" },
              { label: "Conversation", icon: MessageSquare, href: "/conversation" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a
                  className="flex items-center gap-3 rounded-[8px] border border-line px-4 py-3 text-sm font-semibold transition hover:border-brand"
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={18} className="text-brand" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </Panel>
      </div>

      <Panel>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Weekly minutes</h2>
            <p className="mt-1 text-sm text-[#66716c]">
              This chart will use real `lesson_attempts` and `practice_sessions`.
            </p>
          </div>
          <LinkButton href="/progress" variant="secondary" icon={<ArrowRight size={18} />}>
            View Progress
          </LinkButton>
        </div>
          <div className="mt-6 grid grid-cols-7 items-end gap-2">
          {summary.weeklyMinutes.map((item) => (
            <div key={item.day} className="grid gap-2 text-center">
              <div className="flex h-32 items-end rounded-[8px] bg-panel-muted p-1">
                <div
                  className="w-full rounded-[6px] bg-brand"
                  style={{ height: `${Math.max(item.minutes * 2, 6)}px` }}
                />
              </div>
              <span className="text-xs font-semibold text-[#66716c]">{item.day}</span>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <EmptyState
            title="No sessions completed yet"
            description="After Supabase is connected, this page will aggregate completed lessons, correction history, and conversation sessions."
          />
        </div>
      </Panel>
    </div>
  );
}
