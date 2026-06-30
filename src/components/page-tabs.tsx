"use client";

import { ReactNode, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/components/ui";

export type TabItem = {
  id: string;
  label: string;
  icon?: ReactNode;
};

interface PageTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export function PageTabs({ tabs, activeTab, onChange, className }: PageTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  // Keyboard navigation (WAI-ARIA compliant arrow key navigation)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement.getAttribute("role") !== "tab") return;

      const tabElements = Array.from(container.querySelectorAll('[role="tab"]')) as HTMLElement[];
      const currentIndex = tabElements.indexOf(activeElement as HTMLElement);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const tabId = activeElement.getAttribute("data-tab-id");
        if (tabId) onChange(tabId);
        return;
      }

      if (e.key === "ArrowRight") {
        nextIndex = (currentIndex + 1) % tabElements.length;
      } else if (e.key === "ArrowLeft") {
        nextIndex = (currentIndex - 1 + tabElements.length) % tabElements.length;
      } else if (e.key === "Home") {
        nextIndex = 0;
      } else if (e.key === "End") {
        nextIndex = tabElements.length - 1;
      } else {
        return; // Let other keys propagate
      }

      e.preventDefault();
      const nextTab = tabElements[nextIndex];
      if (nextTab) {
        nextTab.focus();
        const tabId = nextTab.getAttribute("data-tab-id");
        if (tabId) onChange(tabId);
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }, [tabs, onChange]);

  useEffect(() => {
    const container = containerRef.current;
    const activeTabElement = activeTabRef.current;
    if (!container || !activeTabElement) return;

    const frame = window.requestAnimationFrame(() => {
      const containerRect = container.getBoundingClientRect();
      const activeTabRect = activeTabElement.getBoundingClientRect();
      const edgePadding = 16;

      if (activeTabRect.left < containerRect.left + edgePadding) {
        container.scrollBy({
          left: activeTabRect.left - containerRect.left - edgePadding,
        });
      } else if (activeTabRect.right > containerRect.right - edgePadding) {
        container.scrollBy({
          left: activeTabRect.right - containerRect.right + edgePadding,
        });
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [activeTab]);

  return (
    <div className={cn("border-b border-line", className)}>
      <div
        ref={containerRef}
        role="tablist"
        aria-label="Page Sections"
        aria-orientation="horizontal"
        className="flex gap-2 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              data-tab-id={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                "group flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all duration-[var(--motion-component)] active:scale-[0.98] cursor-pointer select-none",
                isActive
                  ? "border-brand text-brand"
                  : "border-transparent text-muted hover:border-line hover:text-foreground",
              )}
            >
              {tab.icon && (
                <span
                  className={cn(
                    "transition-colors duration-[var(--motion-component)]",
                    isActive ? "text-brand" : "text-muted-soft group-hover:text-muted",
                  )}
                >
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useTabSync(defaultTab: string, validTabs: string[]) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const queryTab = searchParams ? searchParams.get("tab") : null;
  const activeTab = queryTab && validTabs.includes(queryTab) ? queryTab : defaultTab;

  const changeTab = useCallback(
    (newTab: string) => {
      if (!validTabs.includes(newTab)) return;
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", newTab);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, searchParams, pathname, validTabs]
  );

  return [activeTab, changeTab] as const;
}
