import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

let loaded = false;

function resolveCandidates(): string[] {
  const base = __dirname;
  const candidates = [
    path.resolve(base, "../.env.local"),
    path.resolve(base, "../../.env.local"),
    path.resolve(base, "../.env"),
    path.resolve(base, "../../.env"),
  ];
  return candidates;
}

export function loadEnv(): void {
  if (loaded) return;

  for (const file of resolveCandidates()) {
    if (fs.existsSync(file)) {
      dotenv.config({ path: file });
      loaded = true;
      return;
    }
  }

  loaded = true;
}
