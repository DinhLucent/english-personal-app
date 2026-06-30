import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Info,
  Loader2,
  LockKeyhole,
  XCircle,
} from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type LearningTone = "brand" | "blue" | "violet" | "amber" | "coral" | "neutral";
type StateTone = "info" | "success" | "warning" | "danger" | "neutral";

const toneStyles: Record<LearningTone, string> = {
  brand: "border-brand/20 bg-brand/5 text-brand",
  blue: "border-blue/20 bg-blue/5 text-blue",
  violet: "border-violet/20 bg-violet/5 text-violet",
  amber: "border-warning-line bg-warning-surface text-warning-text",
  coral: "border-danger-line bg-danger-surface text-danger-text",
  neutral: "border-line/70 bg-panel-muted text-muted",
};

const stateToneStyles: Record<
  StateTone,
  {
    frame: string;
    icon: string;
    defaultIcon: ReactNode;
  }
> = {
  info: {
    frame: "border-blue/20 bg-blue/5 text-blue",
    icon: "bg-blue/10 text-blue",
    defaultIcon: <Info size={18} />,
  },
  success: {
    frame: "border-brand/20 bg-[var(--surface-success)] text-brand",
    icon: "bg-brand/10 text-brand",
    defaultIcon: <CheckCircle2 size={18} />,
  },
  warning: {
    frame: "border-warning-line bg-warning-surface text-warning-text",
    icon: "bg-warning/10 text-warning-text",
    defaultIcon: <Info size={18} />,
  },
  danger: {
    frame: "border-danger-line bg-danger-surface text-danger-text",
    icon: "bg-coral/10 text-danger-text",
    defaultIcon: <XCircle size={18} />,
  },
  neutral: {
    frame: "border-line/70 bg-panel-muted text-muted",
    icon: "bg-white text-muted",
    defaultIcon: <Info size={18} />,
  },
};

export function Badge({
  children,
  icon,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  tone?: LearningTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-chip border px-2.5 py-1 text-xs font-semibold leading-none transition-colors duration-[var(--motion-fast)]",
        toneStyles[tone],
        className,
      )}
    >
      {icon ? <span className="flex size-3.5 items-center justify-center">{icon}</span> : null}
      <span>{children}</span>
    </span>
  );
}

const tooltipSideStyles = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  bottom: "left-1/2 top-full mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
};

export function Tooltip({
  children,
  content,
  side = "top",
  className,
}: {
  children: ReactNode;
  content: ReactNode;
  side?: keyof typeof tooltipSideStyles;
  className?: string;
}) {
  return (
    <span className={cn("group relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 max-w-64 scale-95 whitespace-nowrap rounded-chip bg-surface-tooltip px-2.5 py-1.5 text-xs font-semibold leading-5 text-white opacity-0 shadow-md transition-all duration-[var(--motion-fast)] group-hover:scale-100 group-hover:opacity-100 group-focus-within:scale-100 group-focus-within:opacity-100",
          tooltipSideStyles[side],
        )}
      >
        {content}
      </span>
    </span>
  );
}

type ButtonLikeProps = {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  className?: string;
};

const focusVisibleControl =
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/20 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const buttonVariants = {
  primary:
    "border-brand bg-gradient-to-r from-brand to-brand-strong text-white shadow-[var(--shadow-action-primary)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-action-primary-hover)] hover:brightness-[1.04] active:translate-y-0 active:scale-[0.98]",
  secondary:
    "border-line bg-white/90 text-foreground shadow-control hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-control-hover active:translate-y-0 active:scale-[0.98]",
  quiet:
    "border-transparent bg-transparent text-foreground hover:bg-panel-muted active:scale-[0.98]",
  danger:
    "border-coral bg-gradient-to-r from-coral to-danger-strong text-white shadow-[var(--shadow-action-danger)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-action-danger-hover)] hover:brightness-[1.04] active:translate-y-0 active:scale-[0.98]",
};

export function Button({
  children,
  icon,
  variant = "primary",
  className,
  ...props
}: ButtonLikeProps & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-[var(--space-control-x)] py-[var(--space-control-y)] text-sm font-semibold transition-all duration-[var(--motion-component)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 disabled:scale-100",
        focusVisibleControl,
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function LinkButton({
  children,
  icon,
  variant = "primary",
  className,
  href,
}: ButtonLikeProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-[var(--space-control-x)] py-[var(--space-control-y)] text-sm font-semibold transition-all duration-[var(--motion-component)]",
        focusVisibleControl,
        buttonVariants[variant],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}

const iconButtonVariants = {
  primary:
    "border-brand bg-brand text-white shadow-[var(--shadow-action-primary)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-action-primary-hover)] active:translate-y-0 active:scale-95",
  secondary:
    "border-line bg-white/90 text-foreground shadow-control hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-control-hover active:translate-y-0 active:scale-95",
  quiet:
    "border-transparent bg-transparent text-muted hover:bg-panel-muted hover:text-foreground active:scale-95",
  danger:
    "border-danger-line bg-danger-surface text-danger-text hover:-translate-y-0.5 hover:border-coral hover:text-coral active:translate-y-0 active:scale-95",
};

export function IconButton({
  icon,
  label,
  variant = "secondary",
  className,
  title,
  type,
  ...props
}: {
  icon: ReactNode;
  label: string;
  variant?: keyof typeof iconButtonVariants;
  className?: string;
} & ComponentPropsWithoutRef<"button">) {
  return (
    <button
      aria-label={label}
      title={title ?? label}
      type={type ?? "button"}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-control border text-sm transition-all duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0",
        focusVisibleControl,
        iconButtonVariants[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}

export function ProgressRing({
  value,
  max = 100,
  size = 96,
  stroke = 8,
  label,
  detail,
  tone = "brand",
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: string;
  detail?: string;
  tone?: Exclude<LearningTone, "neutral">;
  className?: string;
}) {
  const safeMax = Math.max(max, 1);
  const progress = Math.min(Math.max(value / safeMax, 0), 1);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);
  const toneClass = {
    brand: "text-brand",
    blue: "text-blue",
    violet: "text-violet",
    amber: "text-warning",
    coral: "text-coral",
  }[tone];

  return (
    <div
      data-motion="score"
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ? `${label}: ${Math.round(progress * 100)}%` : `${Math.round(progress * 100)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--surface-panel-muted)"
          strokeWidth={stroke}
        />
        <circle
          className={toneClass}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span>
          {label ? <span className="block text-xs font-semibold text-muted">{label}</span> : null}
          <span className="block text-xl font-bold leading-none text-foreground">
            {Math.round(progress * 100)}%
          </span>
          {detail ? <span className="mt-1 block text-xs text-muted-soft">{detail}</span> : null}
        </span>
      </span>
    </div>
  );
}

export type StepperStep = {
  id: string;
  label: string;
  detail?: string;
  icon?: ReactNode;
  status?: "complete" | "active" | "pending" | "locked" | "loading";
};

function getStepIcon(step: StepperStep) {
  if (step.icon) return step.icon;
  if (step.status === "complete") return <CheckCircle2 size={16} />;
  if (step.status === "locked") return <LockKeyhole size={15} />;
  if (step.status === "loading") return <Loader2 className="animate-spin" size={15} />;
  return <Circle size={14} />;
}

export function Stepper({
  steps,
  className,
}: {
  steps: StepperStep[];
  className?: string;
}) {
  return (
    <ol className={cn("grid gap-2", className)}>
      {steps.map((step, index) => {
        const status = step.status ?? "pending";
        const active = status === "active";
        const complete = status === "complete";
        const locked = status === "locked";

        return (
          <li
            key={step.id}
            data-motion="step"
            aria-current={active ? "step" : undefined}
            className={cn(
              "grid grid-cols-[auto_1fr] items-start gap-2 rounded-card border px-2.5 py-2.5 text-sm transition-all duration-[var(--motion-component)] sm:gap-3 sm:px-3 sm:py-3",
              active && "border-brand/35 bg-brand/5 shadow-[var(--shadow-glow-brand)]",
              complete && "border-brand/20 bg-[var(--surface-success)]",
              locked && "border-line/50 bg-panel-muted/60 text-muted-soft",
              !active && !complete && !locked && "border-line/70 bg-white/80",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-control border text-xs font-semibold transition-all duration-[var(--motion-fast)] sm:size-8",
                active && "border-brand bg-brand text-white",
                complete && "border-brand bg-brand text-white",
                locked && "border-line bg-panel-muted text-muted-soft",
                !active && !complete && !locked && "border-line bg-panel-muted text-muted",
              )}
              aria-hidden="true"
            >
              {getStepIcon(step)}
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{step.label}</span>
                <span className="text-xs font-semibold text-muted-soft">{String(index + 1).padStart(2, "0")}</span>
              </span>
              {step.detail ? <span className="mt-1 hidden leading-5 text-muted sm:block">{step.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function LiveRegion({
  message,
  politeness = "polite",
  className,
}: {
  message: string | null | undefined;
  politeness?: "polite" | "assertive";
  className?: string;
}) {
  if (!message) return null;

  return (
    <span
      className={cn("sr-only", className)}
      role={politeness === "assertive" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </span>
  );
}

export function Skeleton({
  className,
  variant = "block",
}: {
  className?: string;
  variant?: "block" | "text" | "circle";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block animate-pulse bg-panel-muted",
        variant === "block" && "min-h-10 rounded-card",
        variant === "text" && "h-4 rounded-chip",
        variant === "circle" && "size-10 rounded-full",
        className,
      )}
    />
  );
}

const toastStyles = {
  success: {
    frame: "border-brand/20 bg-[var(--surface-success)] text-brand",
    icon: <CheckCircle2 size={18} />,
  },
  info: {
    frame: "border-blue/20 bg-blue/5 text-blue",
    icon: <Info size={18} />,
  },
  warning: {
    frame: "border-warning-line bg-warning-surface text-warning-text",
    icon: <Info size={18} />,
  },
  danger: {
    frame: "border-danger-line bg-danger-surface text-danger-text",
    icon: <XCircle size={18} />,
  },
  neutral: {
    frame: "border-line/70 bg-panel text-muted",
    icon: <Info size={18} />,
  },
};

export function Toast({
  title,
  description,
  tone = "success",
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  tone?: keyof typeof toastStyles;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const styles = toastStyles[tone];
  const politeness = tone === "danger" ? "assertive" : "polite";

  return (
    <div
      data-motion="toast"
      role={tone === "danger" ? "alert" : "status"}
      aria-live={politeness}
      aria-atomic="true"
      className={cn(
        "grid max-w-md grid-cols-[auto_1fr] gap-3 rounded-card border p-4 text-sm leading-6 shadow-panel backdrop-blur-sm",
        styles.frame,
        className,
      )}
    >
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
        {icon ?? styles.icon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        {description ? <span className="mt-1 block text-muted">{description}</span> : null}
        {action ? <span className="mt-3 flex">{action}</span> : null}
      </span>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      data-motion="page-header"
      className="flex flex-col gap-3 border-b border-line/80 pb-5 md:gap-4 md:pb-6 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-[var(--tracking-eyebrow)] text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span>{eyebrow}</span>
          </p>
        ) : null}
        <h1 className="mt-3 max-w-4xl text-2xl font-semibold leading-[1.12] tracking-normal text-foreground md:text-[2.4rem] md:leading-[1.08]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted md:mt-3 md:text-base md:leading-7">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-3">{action}</div> : null}
    </div>
  );
}

const resultMetricTones: Record<Exclude<LearningTone, "neutral">, string> = {
  brand: "border-brand/20 bg-[var(--surface-success)] text-brand",
  blue: "border-blue/20 bg-blue/5 text-blue",
  violet: "border-violet/20 bg-violet/5 text-violet",
  amber: "border-warning-line bg-warning-surface text-warning-text",
  coral: "border-danger-line bg-danger-surface text-danger-text",
};

export function ResultHeader({
  eyebrow,
  title,
  description,
  badges,
  metric,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  badges?: ReactNode;
  metric?: {
    label: string;
    value: string;
    detail?: string;
    tone?: Exclude<LearningTone, "neutral">;
  };
  className?: string;
}) {
  const metricTone = metric?.tone ?? "brand";

  return (
    <div data-motion="completion" className={cn("border-b border-line/70 pb-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[var(--tracking-eyebrow)] text-muted-soft">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="mt-1 text-xl font-semibold leading-tight text-foreground sm:text-2xl">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {metric ? (
          <div
            className={cn(
              "w-full shrink-0 rounded-card border px-3 py-2 text-left sm:w-auto sm:min-w-28",
              resultMetricTones[metricTone],
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{metric.label}</p>
            <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{metric.value}</p>
            {metric.detail ? <p className="mt-1 text-xs font-medium opacity-80">{metric.detail}</p> : null}
          </div>
        ) : null}
      </div>
      {badges ? <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div> : null}
    </div>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold leading-tight text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

type OutputTone = LearningTone;

const outputCardTones: Record<OutputTone, string> = {
  brand: "border-brand/20 bg-[var(--surface-success)] hover:border-brand/40",
  blue: "border-blue/20 bg-blue/5 hover:border-blue/40",
  violet: "border-violet/20 bg-violet/5 hover:border-violet/40",
  amber: "border-warning-line bg-warning-surface hover:border-warning/60",
  coral: "border-danger-line bg-danger-surface hover:border-coral/50",
  neutral: "border-line/60 bg-white/95 hover:border-brand/35",
};

export function OutputCard({
  title,
  eyebrow,
  description,
  badge,
  children,
  tone = "neutral",
  className,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  badge?: ReactNode;
  children?: ReactNode;
  tone?: OutputTone;
  className?: string;
}) {
  return (
    <article
      data-motion="score"
      className={cn(
        "group min-w-0 rounded-card border p-3.5 text-sm leading-6 shadow-[0_2px_10px_rgba(22,33,29,0.03)] transition-all duration-[var(--motion-component)] hover:-translate-y-0.5 hover:shadow-card-hover",
        outputCardTones[tone],
        className,
      )}
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-soft">{eyebrow}</p>
          ) : null}
          <h3 className="break-words font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {children ? <div className="mt-3 min-w-0">{children}</div> : null}
    </article>
  );
}

export function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-motion="panel"
      className={cn(
        "rounded-panel border border-line/70 bg-[var(--surface-panel-soft)] p-[var(--space-panel)] shadow-panel backdrop-blur-sm transition-all duration-[var(--motion-component)] hover:border-line hover:shadow-panel-hover",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function StatBlock({
  label,
  value,
  detail,
  tone = "brand",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "brand" | "coral" | "amber" | "violet";
}) {
  const tones = {
    brand: "bg-brand text-brand",
    coral: "bg-coral text-coral",
    amber: "bg-amber text-amber",
    violet: "bg-violet text-violet",
  };

  const glow = {
    brand: "shadow-[var(--shadow-glow-brand)]",
    coral: "shadow-[var(--shadow-glow-danger)]",
    amber: "shadow-[var(--shadow-glow-warning)]",
    violet: "shadow-[var(--shadow-glow-insight)]",
  };

  return (
    <div
      data-motion="stat"
      className={cn(
        "group relative overflow-hidden rounded-card border border-line/70 bg-white/95 p-[var(--space-panel)] transition-all duration-[var(--motion-component)] hover:-translate-y-1 hover:border-line hover:shadow-card-hover",
        glow[tone],
      )}
    >
      <div className={cn("mb-5 h-1.5 w-12 rounded-full", tones[tone].split(" ")[0])} />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-soft">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-soft">{detail}</p>
      <div className={cn("absolute right-5 top-5 h-8 w-8 rounded-full opacity-10 transition-transform duration-[var(--motion-component)] group-hover:scale-125", tones[tone].split(" ")[0])} />
    </div>
  );
}

export function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold text-foreground">
      {children}
    </label>
  );
}

export function Textarea(props: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-36 w-full resize-y rounded-control border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition-all duration-[var(--motion-fast)] placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10 focus:shadow-sm",
        focusVisibleControl,
        props.className,
      )}
      {...props}
    />
  );
}

export function TextInput(props: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-control border border-line bg-white px-4 text-sm outline-none transition-all duration-[var(--motion-fast)] placeholder:text-muted-soft focus:border-brand focus:ring-4 focus:ring-brand/10 focus:shadow-sm",
        focusVisibleControl,
        props.className,
      )}
      {...props}
    />
  );
}

export function Select(props: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      className={cn(
        "h-11 w-full rounded-control border border-line bg-white px-4 text-sm outline-none transition-all duration-[var(--motion-fast)] focus:border-brand focus:ring-4 focus:ring-brand/10 focus:shadow-sm",
        focusVisibleControl,
        props.className,
      )}
      {...props}
    />
  );
}

export function StateNotice({
  title,
  description,
  tone = "info",
  icon,
  action,
  className,
  role = "status",
}: {
  title: string;
  description?: string;
  tone?: StateTone;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  role?: "status" | "alert" | "note";
}) {
  const styles = stateToneStyles[tone];
  const politeness = role === "alert" || tone === "danger" ? "assertive" : "polite";

  return (
    <div
      data-motion="toast"
      role={role}
      aria-live={politeness}
      aria-atomic="true"
      className={cn(
        "grid gap-3 rounded-card border p-3.5 text-sm leading-6 sm:grid-cols-[auto_1fr] sm:p-4",
        styles.frame,
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-control border border-current/10",
          styles.icon,
        )}
        aria-hidden="true"
      >
        {icon ?? styles.defaultIcon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        {description ? <span className="mt-1 block text-muted">{description}</span> : null}
        {action ? <span className="mt-3 flex flex-wrap gap-2">{action}</span> : null}
      </span>
    </div>
  );
}

export function LoadingState({
  title = "Working on it",
  description = "Preparing a focused learning state.",
  rows = 3,
  className,
}: {
  title?: string;
  description?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div
      data-motion="message"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-atomic="true"
      className={cn("rounded-card border border-line/70 bg-white/80 p-4 text-sm sm:p-5", className)}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-control border border-brand/15 bg-brand/5 text-brand">
          <Loader2 className="animate-spin" size={18} />
        </span>
        <span className="min-w-0">
          <span className="block font-semibold text-foreground">{title}</span>
          <span className="mt-1 block leading-6 text-muted">{description}</span>
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:mt-5">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            className={cn(index === rows - 1 ? "w-2/3" : "w-full", "bg-line/70")}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  tone = "neutral",
  className,
}: {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  tone?: StateTone;
  className?: string;
}) {
  const styles = stateToneStyles[tone];

  return (
    <div
      data-motion="message"
      role="note"
      className={cn(
        "grid gap-3 rounded-card border border-dashed p-4 text-sm leading-6 sm:grid-cols-[auto_1fr] sm:p-5",
        styles.frame,
        className,
      )}
    >
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-control border border-current/10",
          styles.icon,
        )}
        aria-hidden="true"
      >
        {icon ?? styles.defaultIcon}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-muted">{description}</span>
        {action ? <span className="mt-3 flex flex-wrap gap-2">{action}</span> : null}
      </span>
    </div>
  );
}
