import { ArrowRight, BookOpenCheck, MessageSquare, PenLine, Sparkles } from "lucide-react";
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
  const taskDetails = {
    "/daily": { icon: BookOpenCheck, label: "Lesson", tone: "text-brand bg-brand/[0.08]" },
    "/correction": { icon: PenLine, label: "Writing", tone: "text-coral bg-coral/[0.08]" },
    "/conversation": { icon: MessageSquare, label: "Speaking", tone: "text-violet bg-violet/[0.08]" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Your English cockpit for today"
        description="Start with one focused lesson, then reinforce it with correction and conversation practice. Progress is saved to your personal profile."
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
              <p className="mt-1 text-sm text-[var(--muted)]">
                Lesson, correction, conversation, progress.
              </p>
            </div>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-brand/[0.08] text-brand">
              <ArrowRight size={20} />
            </span>
          </div>
          <div className="mt-5 grid gap-3">
            {todayTasks.map((task) => {
              const meta = taskDetails[task.href as keyof typeof taskDetails];
              const Icon = meta?.icon ?? Sparkles;

              return (
              <a
                key={task.href}
                href={task.href}
                data-motion="row"
                className="group grid grid-cols-[auto_1fr_auto] items-start gap-3 rounded-[8px] border border-line/60 bg-white/80 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-white hover:shadow-[0_14px_32px_rgba(22,33,29,0.07)] active:translate-y-0 active:scale-[0.99]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-[8px] ${meta?.tone ?? "bg-panel-muted text-brand"}`}>
                  <Icon size={19} />
                </span>
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{task.title}</span>
                    <span className="rounded-full bg-panel-muted px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
                      {meta?.label ?? "Practice"}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{task.detail}</span>
                </span>
                <ArrowRight size={18} className="mt-1 text-[var(--muted-soft)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand" />
              </a>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Practice mix</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Balanced daily inputs.</p>
          <div className="mt-6 grid gap-4">
            {[
              { label: "Lesson", icon: BookOpenCheck, href: "/daily" },
              { label: "Correction", icon: PenLine, href: "/correction" },
              { label: "Conversation", icon: MessageSquare, href: "/conversation" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a
                  data-motion="row"
                  className="group flex items-center gap-3 rounded-[8px] border border-line/60 bg-white/80 px-4 py-3 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:bg-white hover:shadow-[0_12px_28px_rgba(22,33,29,0.065)] active:translate-y-0 active:scale-[0.99]"
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={18} className="text-brand transition-transform duration-300 group-hover:scale-110" />
                  {item.label}
                </a>
              );
            })}
          </div>
        </Panel>
      </div>

      <div>
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
            {summary.weeklyMinutes.map((item, idx) => (
              <div key={item.day} className="grid gap-2 text-center">
                <div className="flex h-32 items-end rounded-[8px] bg-panel-muted/80 p-1 shadow-inner">
                  <div
                    className="w-full rounded-[6px] bg-gradient-to-t from-brand to-[#2ea27e] animate-growUp"
                    style={{
                      height: `${Math.max(item.minutes * 2, 6)}px`,
                      animationDelay: `${idx * 50 + 400}ms`,
                      animationFillMode: "both"
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
    </div>
  );
}
