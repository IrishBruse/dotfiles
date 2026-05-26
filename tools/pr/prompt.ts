import {
  expandNamedPrompt,
  printInterpolationErrors,
  promptPath,
  resolvePromptsDir
} from "../interpolate/api.ts";

export function buildPrCreatePrompt(repoRoot: string): string {
  const promptsDir = resolvePromptsDir(undefined);
  const file = promptPath(promptsDir, "pr-create");
  const result = expandNamedPrompt("pr-create", { cwd: repoRoot });
  if (result.ok === false) {
    printInterpolationErrors(file, result.errors);
    throw new Error('pr create: failed to expand interpolate prompt "pr-create"');
  }
  return result.text;
}
