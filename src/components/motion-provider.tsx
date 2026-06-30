"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { animate, createTimeline, stagger } from "animejs";
import { learningEventName, type LearningEventDetail } from "@/lib/learning-events";

const reduceMotionQuery = "(prefers-reduced-motion: reduce)";
const dynamicMotionSelector =
  "[data-motion='step'], [data-motion='score'], [data-motion='message'], [data-motion='toast'], [data-motion='completion']";

function readMotionDuration(token: string, fallbackMs: number) {
  const rawValue = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const numericValue = Number.parseFloat(rawValue);

  if (Number.isNaN(numericValue)) {
    return fallbackMs;
  }

  return rawValue.endsWith("s") && !rawValue.endsWith("ms")
    ? numericValue * 1000
    : numericValue;
}

function getMotionDurationMap() {
  return {
    component: readMotionDuration("--motion-component", 300),
    learning: readMotionDuration("--motion-learning-event", 700),
  };
}

function afterHydrationFrame(callback: () => void) {
  let secondFrame = 0;
  const firstFrame = window.requestAnimationFrame(() => {
    secondFrame = window.requestAnimationFrame(callback);
  });

  return () => {
    window.cancelAnimationFrame(firstFrame);
    if (secondFrame) {
      window.cancelAnimationFrame(secondFrame);
    }
  };
}

function resolveLearningEventTarget(target?: string) {
  if (!target) {
    return document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return document.getElementById(target.replace(/^#/, ""));
  }
}

function animateLearningEvent(detail: LearningEventDetail) {
  const target = resolveLearningEventTarget(detail.target);
  if (!target) return null;

  const durations = getMotionDurationMap();
  const childTargets = Array.from(
    target.matches(dynamicMotionSelector)
      ? [target]
      : target.querySelectorAll<HTMLElement>(dynamicMotionSelector),
  );
  const intensityScale = detail.intensity === "strong" ? 1.02 : detail.intensity === "micro" ? 1.006 : 1.012;
  const lift = detail.intensity === "strong" ? 10 : detail.intensity === "micro" ? 2 : 5;
  const timeline = createTimeline({ defaults: { ease: "outCubic" } });

  if (detail.kind === "start" || detail.kind === "send" || detail.kind === "retry") {
    timeline.add(target, {
      scale: { from: 0.985, to: 1 },
      y: { from: 2, to: 0 },
      duration: durations.component,
      ease: "outBack(1.45)",
    });
    return timeline;
  }

  if (detail.kind === "review") {
    timeline.add(target, {
      scale: { from: intensityScale, to: 1 },
      x: { from: 4, to: 0 },
      duration: durations.component,
      ease: "outBack(1.25)",
    });
    return timeline;
  }

  timeline.add(target, {
    opacity: { from: 0.82, to: 1 },
    y: { from: lift, to: 0 },
    scale: { from: 0.985, to: 1 },
    duration: detail.kind === "complete" ? durations.learning : durations.component,
    ease: detail.kind === "complete" ? "outBack(1.45)" : "outCubic",
  });

  if (childTargets.length) {
    timeline.add(
      childTargets,
      {
        opacity: { from: 0.72, to: 1 },
        y: { from: 10, to: 0 },
        scale: { from: 0.985, to: 1 },
        duration: durations.component,
        delay: stagger(36),
        ease: "outCubic",
      },
      "-=260",
    );
  }

  return timeline;
}

function animateDynamicElement(element: HTMLElement) {
  const motionType = element.dataset.motion;
  const durations = getMotionDurationMap();

  if (motionType === "score") {
    return animate(element, {
      opacity: { from: 0, to: 1 },
      y: { from: 10, to: 0 },
      scale: { from: 0.94, to: 1 },
      duration: durations.learning,
      ease: "outBack(1.35)",
    });
  }

  if (motionType === "message") {
    return animate(element, {
      opacity: { from: 0, to: 1 },
      y: { from: 14, to: 0 },
      scale: { from: 0.985, to: 1 },
      duration: durations.component,
      ease: "outCubic",
    });
  }

  if (motionType === "toast") {
    return animate(element, {
      opacity: { from: 0, to: 1 },
      y: { from: -10, to: 0 },
      scale: { from: 0.97, to: 1 },
      duration: durations.component,
      ease: "outBack(1.2)",
    });
  }

  if (motionType === "completion") {
    return animate(element, {
      opacity: { from: 0, to: 1 },
      y: { from: 18, to: 0 },
      scale: { from: 0.92, to: 1 },
      duration: durations.learning,
      ease: "outBack(1.55)",
    });
  }

  return animate(element, {
    opacity: { from: 0, to: 1 },
    y: { from: 8, to: 0 },
    scale: { from: 0.985, to: 1 },
    duration: durations.component,
    ease: "outCubic",
  });
}

export function MotionProvider() {
  const pathname = usePathname();
  const initialPathnameRef = useRef(pathname);
  const initialRenderCompleteRef = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    const main = document.querySelector<HTMLElement>("[data-app-main]");

    const isInitialPathname = pathname === initialPathnameRef.current;

    if (!main || prefersReducedMotion || !initialRenderCompleteRef.current || isInitialPathname) return;

    const pageDuration = readMotionDuration("--motion-page", 480);
    const revealDuration = readMotionDuration("--motion-reveal", 620);

    const header = main.querySelectorAll("[data-motion='page-header']");
    const revealItems = main.querySelectorAll(
      "[data-motion='stat'], [data-motion='panel'], [data-motion='row']",
    );

    const timeline = createTimeline({
      defaults: {
        ease: "outCubic",
      },
    });

    const cancelFrame = afterHydrationFrame(() => {
      if (header.length) {
        timeline.add(header, {
          opacity: { from: 0, to: 1 },
          y: { from: 12, to: 0 },
          duration: pageDuration,
        });
      }

      if (revealItems.length) {
        timeline.add(
          revealItems,
          {
            opacity: { from: 0, to: 1 },
            y: { from: 18, to: 0 },
            scale: { from: 0.985, to: 1 },
            duration: revealDuration,
            delay: stagger(44, { from: "first" }),
          },
          header.length ? "-=180" : 0,
        );
      }
    });

    return () => {
      cancelFrame();
      timeline.revert();
    };
  }, [pathname]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    const main = document.querySelector<HTMLElement>("[data-app-main]");

    if (!main || prefersReducedMotion) return;

    const motionRoot = main;
    const animatedElements = new WeakSet<HTMLElement>();
    const activeAnimations = new Set<{ revert: () => void }>();
    const isInitialPathname = pathname === initialPathnameRef.current;
    const shouldAnimateExistingElements = initialRenderCompleteRef.current && !isInitialPathname;
    let observer: MutationObserver | null = null;

    function queueAnimation(element: HTMLElement) {
      if (animatedElements.has(element)) return;

      animatedElements.add(element);
      const animation = animateDynamicElement(element);
      activeAnimations.add(animation);
    }

    function collectMotionElements(root: Element) {
      if (root instanceof HTMLElement && root.matches(dynamicMotionSelector)) {
        queueAnimation(root);
      }

      root.querySelectorAll<HTMLElement>(dynamicMotionSelector).forEach(queueAnimation);
    }

    function startObserver() {
      observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element) {
              collectMotionElements(node);
            }
          });
        });
      });

      observer.observe(motionRoot, {
        childList: true,
        subtree: true,
      });
    }

    const cancelFrame = afterHydrationFrame(() => {
      if (shouldAnimateExistingElements) {
        collectMotionElements(motionRoot);
      }

      if (isInitialPathname) return;

      startObserver();
    });


    return () => {
      cancelFrame();
      observer?.disconnect();
      activeAnimations.forEach((animation) => animation.revert());
      activeAnimations.clear();
    };
  }, [pathname]);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    if (prefersReducedMotion) return;

    const brandDuration = readMotionDuration("--motion-brand", 920);
    const navDuration = readMotionDuration("--motion-nav", 520);
    const activeAnimations = new Set<{ revert: () => void }>();

    const cancelFrame = afterHydrationFrame(() => {
      activeAnimations.add(animate("[data-motion='brand-mark'] svg", {
        rotate: { from: -18, to: 0 },
        scale: { from: 0.82, to: 1 },
        duration: brandDuration,
        ease: "outBack(1.45)",
      }));

      activeAnimations.add(animate("[data-motion='nav-item']", {
        opacity: { from: 0, to: 1 },
        x: { from: -10, to: 0 },
        duration: navDuration,
        delay: stagger(34),
        ease: "outCubic",
      }));
    });

    return () => {
      cancelFrame();
      activeAnimations.forEach((animation) => animation.revert());
      activeAnimations.clear();
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(reduceMotionQuery).matches;
    if (prefersReducedMotion) return;

    const activeAnimations = new Set<{ revert: () => void }>();

    function handleLearningEvent(event: Event) {
      const detail = (event as CustomEvent<LearningEventDetail>).detail;
      if (!detail?.kind) return;

      const animation = animateLearningEvent(detail);
      if (!animation) return;

      activeAnimations.add(animation);
      window.setTimeout(() => activeAnimations.delete(animation), 1400);
    }

    window.addEventListener(learningEventName, handleLearningEvent);

    return () => {
      window.removeEventListener(learningEventName, handleLearningEvent);
      activeAnimations.forEach((animation) => animation.revert());
      activeAnimations.clear();
    };
  }, []);

  useEffect(() => {
    initialRenderCompleteRef.current = true;
  }, []);

  return null;
}
