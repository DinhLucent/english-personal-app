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
  primary: "border-brand bg-brand text-white hover:bg-brand-strong",
  secondary: "border-line bg-white text-foreground hover:border-brand hover:text-brand",
  quiet: "border-transparent bg-transparent text-foreground hover:bg-panel-muted",
  danger: "border-coral bg-coral text-white hover:bg-[#b84f40]",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-semibold transition",
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
    <div className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#56635d]">{description}</p>
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
    <section className={cn("rounded-[8px] border border-line bg-panel p-5", className)}>
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
    brand: "bg-brand",
    coral: "bg-coral",
    amber: "bg-amber",
    violet: "bg-violet",
  };

  return (
    <div className="rounded-[8px] border border-line bg-panel p-5">
      <div className={cn("mb-5 h-1.5 w-12 rounded-full", tones[tone])} />
      <p className="text-sm font-medium text-[#66716c]">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-[#66716c]">{detail}</p>
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
        "min-h-36 w-full resize-y rounded-[8px] border border-line bg-white px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-[#8b9691] focus:border-brand",
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
        "h-11 w-full rounded-[8px] border border-line bg-white px-4 text-sm outline-none transition placeholder:text-[#8b9691] focus:border-brand",
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
        "h-11 w-full rounded-[8px] border border-line bg-white px-4 text-sm outline-none transition focus:border-brand",
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
    <div className="rounded-[8px] border border-dashed border-line bg-panel-muted p-6 text-sm">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 leading-6 text-[#66716c]">{description}</p>
    </div>
  );
}
