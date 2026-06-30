import {
  getMissionPath,
  resolveMissionByCompletedCount,
  resolveMissionDayNumber,
  type MissionTrack,
  type SpeakingMission,
} from "@/lib/missions";
import { getCurrentUser } from "@/lib/supabase/server";

export type CurrentMissionResolution = {
  mission: SpeakingMission;
  dayNumber: number;
  completedMissions: number;
  totalMissions: number;
  source: "supabase" | "static";
  reason?: string;
};

async function getCompletedMissionCount(track: MissionTrack) {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return {
      completedMissions: 0,
      source: "static" as const,
      reason: "Supabase personal profile is unavailable.",
    };
  }

  const { count, error } = await supabase
    .from("mission_attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (error) {
    return {
      completedMissions: 0,
      source: "static" as const,
      reason: `Mission attempts are unavailable for ${track}: ${error.message}`,
    };
  }

  return {
    completedMissions: count ?? 0,
    source: "supabase" as const,
    reason: undefined,
  };
}

export async function getCurrentMissionResolution({
  track = "workplace",
}: {
  track?: MissionTrack;
} = {}): Promise<CurrentMissionResolution> {
  const missionPath = getMissionPath({ track });
  const totalMissions = missionPath.length;
  const missionCount = await getCompletedMissionCount(track);
  const dayNumber = resolveMissionDayNumber({
    completedMissions: missionCount.completedMissions,
    track,
  });
  const mission =
    resolveMissionByCompletedCount({
      completedMissions: missionCount.completedMissions,
      track,
    }) ?? missionPath[0];

  if (!mission) {
    throw new Error(`No speaking missions are configured for track: ${track}`);
  }

  return {
    mission,
    dayNumber,
    totalMissions,
    completedMissions: missionCount.completedMissions,
    source: missionCount.source,
    reason: missionCount.reason,
  };
}
