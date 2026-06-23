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

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1">
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
              active
                ? "bg-gradient-to-r from-brand to-brand-strong text-white shadow-sm shadow-brand/10"
                : "text-[#52605a] hover:bg-panel-muted hover:text-foreground hover:translate-x-[2px]",
            )}
          >
            <Icon aria-hidden="true" size={18} />
            <span>{item.label}</span>
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="rounded-[8px] border border-line bg-panel p-2 lg:hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm font-semibold text-foreground outline-none"
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
        <div className="mt-2 border-t border-line pt-2 animate-fadeIn">
          <AppNav />
        </div>
      )}
    </div>
  );
}
