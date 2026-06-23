import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonLikeProps = {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  className?: string;
};

const buttonVariants = {
  primary:
    "border-brand bg-gradient-to-r from-brand to-brand-strong text-white shadow-[0_10px_24px_rgba(20,125,100,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(20,125,100,0.22)] hover:brightness-[1.04] active:translate-y-0 active:scale-[0.98]",
  secondary:
    "border-line bg-white/90 text-foreground shadow-[0_6px_18px_rgba(22,33,29,0.04)] hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-[0_12px_28px_rgba(22,33,29,0.08)] active:translate-y-0 active:scale-[0.98]",
  quiet:
    "border-transparent bg-transparent text-foreground hover:bg-panel-muted active:scale-[0.98]",
  danger:
    "border-coral bg-gradient-to-r from-coral to-[#aa4038] text-white shadow-[0_10px_24px_rgba(201,79,67,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(201,79,67,0.22)] hover:brightness-[1.04] active:translate-y-0 active:scale-[0.98]",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:translate-y-0 disabled:scale-100",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition-all duration-300",
        buttonVariants[variant],
        className,
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
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
      className="flex flex-col gap-4 border-b border-line/80 pb-6 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/15 bg-brand/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span>{eyebrow}</span>
          </p>
        ) : null}
        <h1 className="mt-3 max-w-4xl text-3xl font-semibold leading-[1.08] tracking-normal text-foreground md:text-[2.4rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 gap-3">{action}</div> : null}
    </div>
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
        "rounded-[8px] border border-line/70 bg-white/[0.92] p-5 shadow-[0_10px_30px_rgba(22,33,29,0.045)] backdrop-blur-sm transition-all duration-300 hover:border-line hover:shadow-[0_18px_50px_rgba(22,33,29,0.075)]",
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
    brand: "shadow-[0_14px_34px_rgba(20,125,100,0.08)]",
    coral: "shadow-[0_14px_34px_rgba(201,79,67,0.08)]",
    amber: "shadow-[0_14px_34px_rgba(169,104,22,0.08)]",
    violet: "shadow-[0_14px_34px_rgba(85,87,198,0.08)]",
  };

  return (
    <div
      data-motion="stat"
      className={cn(
        "group relative overflow-hidden rounded-[8px] border border-line/70 bg-white/95 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-line hover:shadow-[0_18px_46px_rgba(22,33,29,0.09)]",
        glow[tone],
      )}
    >
      <div className={cn("mb-5 h-1.5 w-12 rounded-full", tones[tone].split(" ")[0])} />
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-soft)]">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[var(--muted-soft)]">{detail}</p>
      <div className={cn("absolute right-5 top-5 h-8 w-8 rounded-full opacity-10 transition-transform duration-300 group-hover:scale-125", tones[tone].split(" ")[0])} />
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
        "min-h-36 w-full resize-y rounded-[8px] border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition-all placeholder:text-[var(--muted-soft)] focus:border-brand focus:ring-4 focus:ring-brand/10 focus:shadow-sm",
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
        "h-11 w-full rounded-[8px] border border-line bg-white px-4 text-sm outline-none transition-all placeholder:text-[var(--muted-soft)] focus:border-brand focus:ring-4 focus:ring-brand/10 focus:shadow-sm",
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
        "h-11 w-full rounded-[8px] border border-line bg-white px-4 text-sm outline-none transition-all focus:border-brand focus:ring-4 focus:ring-brand/10 focus:shadow-sm",
        props.className,
      )}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[8px] border border-dashed border-line bg-panel-muted/80 p-6 text-sm">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-6 text-[var(--muted)]">{description}</p>
    </div>
  );
}
