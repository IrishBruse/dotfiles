import process from "node:process";

import { interpolate } from "../interpolate/api.ts";

export function buildPrCreatePrompt(repoRoot: string): string {
  const prevCwd = process.cwd();
  try {
    process.chdir(repoRoot);
    return interpolate("pr-create");
  } finally {
    process.chdir(prevCwd);
  }
}
