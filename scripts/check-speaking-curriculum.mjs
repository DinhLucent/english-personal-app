import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const missionsPath = path.join(root, "src/lib/missions.ts");
const source = fs.readFileSync(missionsPath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const exported = {};
new Function("exports", compiled)(exported);

const missionPath = exported.getMissionPath();
const expectedDays = Array.from({ length: 30 }, (_, index) => index + 1);
const requiredRubricKeys = [
  "taskCompletion",
  "fluency",
  "accuracy",
  "vocabulary",
  "interaction",
];
const requiredMilestones = new Map([
  [7, "review"],
  [14, "review"],
  [21, "review"],
  [28, "review"],
  [30, "assessment"],
]);

const issues = [];

function addIssue(message) {
  issues.push(message);
}

if (missionPath.length !== expectedDays.length) {
  addIssue(`Expected 30 missions, found ${missionPath.length}.`);
}

const days = missionPath.map((mission) => mission.dayNumber);
for (const day of expectedDays) {
  if (!days.includes(day)) {
    addIssue(`Missing day ${day}.`);
  }
}

if (new Set(days).size !== days.length) {
  addIssue("Mission day numbers must be unique.");
}

for (const [index, mission] of missionPath.entries()) {
  const expectedDay = expectedDays[index];
  if (mission.dayNumber !== expectedDay) {
    addIssue(`Mission at index ${index} should be day ${expectedDay}, found day ${mission.dayNumber}.`);
  }

  if (!mission.id.startsWith("workplace-day-")) {
    addIssue(`${mission.id} must use the workplace-day slug prefix.`);
  }

  for (const field of ["title", "goal", "scenario", "roleplayPrompt"]) {
    if (!mission[field]?.trim()) {
      addIssue(`${mission.id} is missing ${field}.`);
    }
  }

  if (mission.track !== "workplace") {
    addIssue(`${mission.id} must use workplace track.`);
  }

  if (!mission.steps.includes("prepare") || !mission.steps.includes("review")) {
    addIssue(`${mission.id} must include the full speaking loop steps.`);
  }

  if (mission.targetChunks.length < 3) {
    addIssue(`${mission.id} needs at least 3 target chunks.`);
  }

  if (mission.targetVocabulary.length < 3) {
    addIssue(`${mission.id} needs at least 3 vocabulary items.`);
  }

  if (mission.practiceQuestions.length < 3) {
    addIssue(`${mission.id} needs at least 3 practice questions.`);
  }

  const rubricKeys = mission.rubric.map((item) => item.key);
  for (const key of requiredRubricKeys) {
    if (!rubricKeys.includes(key)) {
      addIssue(`${mission.id} is missing rubric key ${key}.`);
    }
  }
}

for (const [day, expectedTerm] of requiredMilestones) {
  const mission = missionPath.find((item) => item.dayNumber === day);
  const searchableText = `${mission?.id ?? ""} ${mission?.title ?? ""} ${mission?.goal ?? ""}`.toLowerCase();

  if (!searchableText.includes(expectedTerm)) {
    addIssue(`Day ${day} should be a ${expectedTerm} milestone.`);
  }
}

const migrationFiles = [
  "supabase/migrations/202606230002_seed_workplace_speaking_missions.sql",
  "supabase/migrations/202606230003_seed_workplace_speaking_missions_30.sql",
];
const migrationSql = migrationFiles
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");

for (const mission of missionPath) {
  if (!migrationSql.includes(`'${mission.id}'`)) {
    addIssue(`Migration seed is missing ${mission.id}.`);
  }
}

if (issues.length) {
  console.log("Speaking curriculum check failed:");
  for (const issue of issues) {
    console.log(`FAIL ${issue}`);
  }
  process.exitCode = 1;
} else {
  console.log("OK speaking curriculum has 30 complete workplace missions.");
  console.log("OK migration seeds include every mission slug.");
}
