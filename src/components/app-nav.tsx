"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Activity,
  BookOpenCheck,
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
              "flex min-h-10 items-center gap-3 rounded-[8px] px-3 text-sm font-medium transition",
              active
                ? "bg-brand text-white"
                : "text-[#52605a] hover:bg-panel-muted hover:text-foreground",
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
  const activeItem = navItems.find((item) => item.href === pathname);
  const ActiveIcon = activeItem?.icon ?? Gauge;

  return (
    <details className="rounded-[8px] border border-line bg-panel p-2 lg:hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-[8px] px-3 py-2 text-sm font-semibold">
        <ActiveIcon size={18} />
        {activeItem?.label ?? "Navigate"}
      </summary>
      <div className="mt-2 border-t border-line pt-2">
        <AppNav />
      </div>
    </details>
  );
}
