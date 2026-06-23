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
import { cn } from "@/components/ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/daily", label: "Daily", icon: BookOpenCheck },
  { href: "/conversation", label: "Conversation", icon: MessageSquare },
  { href: "/correction", label: "Correction", icon: PenLine },
  { href: "/vocabulary", label: "Vocabulary", icon: Sparkles },
  { href: "/grammar", label: "Grammar", icon: SpellCheck },
  { href: "/reflex", label: "Reflex", icon: Repeat2 },
  { href: "/assessment", label: "Assessment", icon: Target },
  { href: "/progress", label: "Progress", icon: BarChart3 },
  { href: "/status", label: "Status", icon: Activity },
];

export function AppNav({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const [completedStatus, setCompletedStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkCompletions = () => {
      setCompletedStatus({
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

  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            data-motion="nav-item"
            onClick={onNavigate}
            className={cn(
              "group flex min-h-11 items-center rounded-[8px] text-sm font-semibold transition-all duration-300 active:scale-[0.98]",
              collapsed ? "justify-center px-0 relative" : "gap-3 px-3",
              active
                ? "bg-gradient-to-r from-brand to-brand-strong text-white shadow-[0_12px_26px_rgba(20,125,100,0.2)]"
                : "text-[var(--muted)] hover:bg-white/80 hover:text-foreground hover:shadow-[0_8px_22px_rgba(22,33,29,0.045)]",
              !active && !collapsed && "hover:translate-x-1",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] transition-colors duration-300 relative",
                active ? "bg-white/[0.14]" : "bg-transparent text-[var(--muted)] group-hover:bg-panel-muted group-hover:text-brand",
              )}
            >
              <Icon aria-hidden="true" size={18} />
              {collapsed && completedStatus[item.href] && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-brand border border-panel shadow-xs" title="Completed today!" />
              )}
            </span>
            {collapsed ? (
              <span className="absolute left-14 z-50 origin-left scale-95 rounded-[6px] bg-[#1d2420] px-2.5 py-1.5 text-xs font-semibold text-white shadow-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-2 transition-all duration-200 whitespace-nowrap">
                {item.label}
              </span>
            ) : (
              <>
                <span>{item.label}</span>
                {completedStatus[item.href] && (
                  <span className="ml-auto flex h-2 w-2 rounded-full bg-brand animate-pulse" title="Completed today!" />
                )}
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const activeItem = navItems.find((item) => item.href === pathname);
  const ActiveIcon = activeItem?.icon ?? Gauge;

  return (
    <div className="rounded-[8px] border border-line/70 bg-white/[0.88] p-2 shadow-[0_10px_30px_rgba(22,33,29,0.055)] backdrop-blur-sm lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm font-semibold text-foreground outline-none transition hover:bg-panel-muted"
        aria-expanded={open}
      >
        <span className="flex items-center gap-3">
          <ActiveIcon size={18} />
          {activeItem?.label ?? "Navigate"}
        </span>
        <ChevronDown
          size={16}
          className={cn("text-[#66716c] transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="mt-2 border-t border-line/70 pt-2 animate-fadeIn">
          <AppNav onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
