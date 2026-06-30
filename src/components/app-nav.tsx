"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Activity,
  BookOpenCheck,
  ChevronDown,
  Gauge,
  Home,
  MessageSquare,
  PenLine,
  Repeat2,
  Sparkles,
  SpellCheck,
  Target,
} from "lucide-react";
import { Badge, Tooltip, cn } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home, group: "Mission", description: "Today cockpit" },
  { href: "/speaking", label: "Speaking", icon: Target, group: "Mission", description: "Mission studio" },
  { href: "/review", label: "Review", icon: Repeat2, group: "Mission", description: "Due queue" },
  { href: "/daily", label: "Daily", icon: BookOpenCheck, group: "Practice", description: "Generated lesson" },
  { href: "/conversation", label: "Conversation", icon: MessageSquare, group: "Practice", description: "Dialogue turns" },
  { href: "/correction", label: "Correction", icon: PenLine, group: "Practice", description: "Writing fixes" },
  { href: "/vocabulary", label: "Vocabulary", icon: Sparkles, group: "Tools", description: "Words and chunks" },
  { href: "/grammar", label: "Grammar", icon: SpellCheck, group: "Tools", description: "Pattern practice" },
  { href: "/reflex", label: "Reflex", icon: Repeat2, group: "Tools", description: "Fast answers" },
  { href: "/assessment", label: "Assessment", icon: Target, group: "Tools", description: "Level check" },
  { href: "/progress", label: "Progress", icon: BarChart3, group: "System", description: "Rubric trend" },
  { href: "/status", label: "Status", icon: Activity, group: "System", description: "App health" },
];

export function AppNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const [completedStatus, setCompletedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkCompletions = () => {
      setCompletedStatus({
        "/speaking": localStorage.getItem("speakflow:speaking-completed") === "true",
        "/daily": localStorage.getItem("speakflow:daily-completed") === "true",
        "/conversation": localStorage.getItem("speakflow:conversation-completed") === "true",
        "/reflex": localStorage.getItem("speakflow:reflex-completed") === "true",
      });
    };

    checkCompletions();

    window.addEventListener("storage", checkCompletions);
    window.addEventListener("speakflow:progress-update", checkCompletions);

    return () => {
      window.removeEventListener("storage", checkCompletions);
      window.removeEventListener("speakflow:progress-update", checkCompletions);
    };
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const groupedNavItems = navItems.reduce<Array<{ group: string; items: typeof navItems }>>((groups, item) => {
    const lastGroup = groups.at(-1);

    if (lastGroup?.group === item.group) {
      lastGroup.items.push(item);
    } else {
      groups.push({ group: item.group, items: [item] });
    }

    return groups;
  }, []);

  return (
    <nav aria-label={collapsed ? "Collapsed primary navigation" : "Primary navigation"} className={cn("grid", collapsed ? "gap-1.5" : "gap-5")}>
      {groupedNavItems.map(({ group, items }) => (
        <div key={group} className="grid gap-1">
          {!collapsed ? (
            <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[var(--tracking-eyebrow)] text-muted-soft">
              {group}
            </p>
          ) : group !== groupedNavItems[0].group ? (
            <span className="mx-auto my-1 h-px w-7 bg-line/80" aria-hidden="true" />
          ) : null}

          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const completed = completedStatus[item.href];
            const navLink = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                data-motion="nav-item"
                onClick={onNavigate}
                className={cn(
                  "group relative flex min-h-11 items-center rounded-control text-sm font-semibold transition-all duration-[var(--motion-component)] active:scale-[0.98]",
                  collapsed ? "justify-center px-0" : "gap-3 px-3",
                  active
                    ? "bg-gradient-to-r from-brand to-brand-strong text-white shadow-nav-active"
                    : "text-muted hover:bg-white/80 hover:text-foreground hover:shadow-nav-hover",
                  !active && !collapsed && "hover:translate-x-1",
                )}
              >
                <span
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-control transition-colors duration-[var(--motion-component)]",
                    active ? "bg-white/[0.14]" : "bg-transparent text-muted group-hover:bg-panel-muted group-hover:text-brand",
                  )}
                >
                  <Icon aria-hidden="true" size={18} />
                  {collapsed && completed ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full border border-panel bg-brand shadow-xs" />
                  ) : null}
                </span>
                {!collapsed ? (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{item.label}</span>
                      <span className={cn("mt-0.5 block truncate text-xs font-medium", active ? "text-white/75" : "text-muted-soft")}>
                        {item.description}
                      </span>
                    </span>
                    {completed ? (
                      <Badge tone={active ? "brand" : "neutral"} className={cn(active && "border-white/20 bg-white/10 text-white")}>
                        Done
                      </Badge>
                    ) : null}
                  </>
                ) : null}
              </Link>
            );

            return collapsed ? (
              <Tooltip key={item.href} content={item.label} side="right" className="w-full justify-center">
                {navLink}
              </Tooltip>
            ) : (
              navLink
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mobileNavId = "mobile-navigation-menu";
  const activeItem = navItems.find((item) => item.href === pathname);
  const ActiveIcon = activeItem?.icon ?? Gauge;

  return (
    <div className="rounded-control border border-line/70 bg-[var(--surface-panel-glass)] p-1.5 shadow-control backdrop-blur-sm lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex min-h-10 w-full cursor-pointer items-center justify-between rounded-control px-3 text-sm font-semibold text-foreground outline-none transition hover:bg-panel-muted"
        aria-expanded={open}
        aria-controls={mobileNavId}
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-control bg-brand/5 text-brand">
            <ActiveIcon size={17} />
          </span>
          <span className="truncate">{activeItem?.label ?? "Navigate"}</span>
        </span>
        <ChevronDown
          size={16}
          className={cn("text-muted-soft transition-transform duration-[var(--motion-fast)]", open && "rotate-180")}
        />
      </button>
      {open && (
        <div id={mobileNavId} className="mt-1.5 max-h-[70vh] overflow-y-auto border-t border-line/70 pt-2 animate-fadeIn">
          <AppNav onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
