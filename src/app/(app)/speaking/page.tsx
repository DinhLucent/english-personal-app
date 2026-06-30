import { Suspense } from "react";
import { SpeakingStudioClient } from "@/app/(app)/speaking/speaking-studio-client";
import { getCurrentMissionResolution } from "@/lib/mission-resolver";
import { getMissionById } from "@/lib/missions";

export default async function SpeakingPage({
  searchParams,
}: {
  searchParams?: Promise<{ mission?: string }>;
}) {
  const params = await searchParams;
  const missionResolution = await getCurrentMissionResolution();
  const missionOverride = params?.mission
    ? getMissionById(params.mission)
    : null;
  const mission = missionOverride ?? missionResolution.mission;

  return (
    <Suspense fallback={<div>Loading Speaking Studio...</div>}>
      <SpeakingStudioClient
        mission={mission}
        totalMissions={missionResolution.totalMissions}
        resolutionReason={
          missionOverride
            ? "Adaptive practice mode: this mission was recommended from your weak skill signal."
            : missionResolution.reason
        }
      />
    </Suspense>
  );
}
