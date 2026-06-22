import fs from "node:fs";
import path from "node:path";

export function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        if (index === -1) return [line, ""];
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

export function loadLocalEnv(root = process.cwd()) {
  return {
    ...parseEnvFile(path.join(root, ".env.example")),
    ...parseEnvFile(path.join(root, ".env.local")),
    ...process.env,
  };
}
