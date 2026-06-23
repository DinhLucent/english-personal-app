"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { animate, createTimeline, stagger } from "animejs";

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";

export function MotionProvider() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    const main = document.querySelector<HTMLElement>("[data-app-main]");

    if (!main || prefersReducedMotion) return;

    const header = main.querySelectorAll("[data-motion='page-header']");
    const revealItems = main.querySelectorAll(
      "[data-motion='stat'], [data-motion='panel'], [data-motion='row']",
    );

    const timeline = createTimeline({
      defaults: {
        ease: "outCubic",
      },
    });

    if (header.length) {
      timeline.add(header, {
        opacity: { from: 0, to: 1 },
        y: { from: 12, to: 0 },
        duration: 480,
      });
    }

    if (revealItems.length) {
      timeline.add(
        revealItems,
        {
          opacity: { from: 0, to: 1 },
          y: { from: 18, to: 0 },
          scale: { from: 0.985, to: 1 },
          duration: 620,
          delay: stagger(44, { from: "first" }),
        },
        header.length ? "-=180" : 0,
      );
    }

    return () => {
      timeline.revert();
    };
  }, [pathname]);

  useLayoutEffect(() => {
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    if (prefersReducedMotion) return;

    const brandAnimation = animate("[data-motion='brand-mark'] svg", {
      rotate: { from: -18, to: 0 },
      scale: { from: 0.82, to: 1 },
      duration: 920,
      ease: "outBack(1.45)",
    });

    const navAnimation = animate("[data-motion='nav-item']", {
      opacity: { from: 0, to: 1 },
      x: { from: -10, to: 0 },
      duration: 520,
      delay: stagger(34),
      ease: "outCubic",
    });

    return () => {
      brandAnimation.revert();
      navAnimation.revert();
    };
  }, []);

  return null;
}
