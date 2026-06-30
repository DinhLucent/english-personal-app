import { Suspense } from "react";
import { DashboardClient } from "@/components/dashboard-client";
import { buildAdaptiveMissionRecommendation } from "@/lib/adaptive-mission";
import { getCurrentMissionResolution } from "@/lib/mission-resolver";
import { getMissionPath } from "@/lib/missions";
import { getProgressSummary } from "@/lib/progress";

export default async function DashboardPage() {
  const [summary, missionResolution] = await Promise.all([
    getProgressSummary(),
    getCurrentMissionResolution(),
  ]);
  const missionPath = getMissionPath();
  const currentMission = missionResolution.mission;
  const adaptiveRecommendation = buildAdaptiveMissionRecommendation({
    missionPath,
    currentMission,
    weakestSkill: summary.weakestSkill,
  });

  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <DashboardClient
        summary={summary}
        missionResolution={missionResolution}
        missionPath={missionPath}
        adaptiveRecommendation={adaptiveRecommendation}
      />
    </Suspense>
  );
}
