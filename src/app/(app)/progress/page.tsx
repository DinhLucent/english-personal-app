import { Suspense } from "react";
import { ProgressClient } from "@/components/progress-client";
import { buildAdaptiveMissionRecommendation } from "@/lib/adaptive-mission";
import { getCurrentMissionResolution } from "@/lib/mission-resolver";
import { getMissionPath } from "@/lib/missions";
import {
  buildVisualFixtureProgressSummary,
  getProgressSummary,
} from "@/lib/progress";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams?: Promise<{ visualFixture?: string }>;
}) {
  const params = await searchParams;
  const [summary, missionResolution] = await Promise.all([
    process.env.NODE_ENV !== "production" && params?.visualFixture === "rich"
      ? Promise.resolve(buildVisualFixtureProgressSummary())
      : getProgressSummary(),
    getCurrentMissionResolution(),
  ]);
  const adaptiveRecommendation = buildAdaptiveMissionRecommendation({
    missionPath: getMissionPath(),
    currentMission: missionResolution.mission,
    weakestSkill: summary.weakestSkill,
  });

  return (
    <Suspense fallback={<div>Loading Progress...</div>}>
      <ProgressClient
        summary={summary}
        adaptiveRecommendation={adaptiveRecommendation}
      />
    </Suspense>
  );
}
