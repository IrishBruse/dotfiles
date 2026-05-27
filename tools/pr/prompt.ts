import { interpolate } from "../interpolate/api.ts";

export function buildPrCreatePrompt(repoRoot: string): string {
  return interpolate("pr-create", { cwd: repoRoot });
}

export function buildPrUpdatePrompt(repoRoot: string, target: string): string {
  return interpolate("pr-update", {
    cwd: repoRoot,
    vars: { target }
  });
}
