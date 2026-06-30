import type { SpeakingMission, SpeakingRubricKey } from "@/lib/missions";
import type { RubricSkillProgress } from "@/lib/progress";

export type AdaptiveMissionRecommendation = {
  mission: SpeakingMission;
  weakSkillKey: SpeakingRubricKey | null;
  weakSkillLabel: string;
  weakSkillScore: number | null;
  reason: string;
  focus: string;
  suggestedAction: string;
  source: "rubric" | "default";
};

const skillMissionPriority: Record<SpeakingRubricKey, number[]> = {
  taskCompletion: [1, 2, 5, 7, 8, 13, 21, 28, 30],
  fluency: [3, 7, 10, 16, 22, 28, 30],
  accuracy: [2, 4, 9, 14, 19, 24, 29],
  vocabulary: [1, 2, 5, 6, 11, 17, 23, 27],
  interaction: [4, 6, 12, 15, 18, 20, 25, 26],
};

const skillFocus: Record<SpeakingRubricKey, string> = {
  taskCompletion: "Answer the exact mission goal with a clear beginning, detail, and closing line.",
  fluency: "Extend each answer with one extra detail so it does not stop too early.",
  accuracy: "Use the target sentence patterns carefully and repair common grammar slips.",
  vocabulary: "Force the target chunks and workplace words into the answer naturally.",
  interaction: "Ask, clarify, confirm, or add one follow-up so the dialogue keeps moving.",
};

function pickMissionForWeakSkill({
  missionPath,
  currentMission,
  weakSkillKey,
}: {
  missionPath: SpeakingMission[];
  currentMission: SpeakingMission;
  weakSkillKey: SpeakingRubricKey;
}) {
  const preferredDays = skillMissionPriority[weakSkillKey];
  const availableMissions = missionPath.filter(
    (mission) => mission.dayNumber >= currentMission.dayNumber,
  );

  return (
    preferredDays
      .map((dayNumber) =>
        availableMissions.find((mission) => mission.dayNumber === dayNumber),
      )
      .find(Boolean) ??
    availableMissions[0] ??
    currentMission
  );
}

export function buildAdaptiveMissionRecommendation({
  missionPath,
  currentMission,
  weakestSkill,
}: {
  missionPath: SpeakingMission[];
  currentMission: SpeakingMission;
  weakestSkill: RubricSkillProgress | null;
}): AdaptiveMissionRecommendation {
  if (!weakestSkill || weakestSkill.average === null) {
    return {
      mission: currentMission,
      weakSkillKey: null,
      weakSkillLabel: "Not enough scored speaking yet",
      weakSkillScore: null,
      reason:
        "Complete one Speaking Studio feedback and retry cycle so the coach can adapt the next mission.",
      focus: "Use the current mission to create your first rubric signal.",
      suggestedAction: "Start the current mission and finish feedback plus retry.",
      source: "default",
    };
  }

  const weakSkillKey = weakestSkill.key as SpeakingRubricKey;
  const mission = pickMissionForWeakSkill({
    missionPath,
    currentMission,
    weakSkillKey,
  });

  return {
    mission,
    weakSkillKey,
    weakSkillLabel: weakestSkill.label,
    weakSkillScore: weakestSkill.average,
    reason: `${weakestSkill.label} is currently the weakest scored skill, so this mission is prioritized to train it.`,
    focus: skillFocus[weakSkillKey],
    suggestedAction: `Practice "${mission.title}" and pay attention to ${weakestSkill.label.toLowerCase()}.`,
    source: "rubric",
  };
}
