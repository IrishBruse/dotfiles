import { isWorkPolicy, WORK_TITLE_REQUIREMENT } from "../../workPolicy.ts";

export function buildCreatePrompt(repoRoot: string, branch: string): string {
  const lines = [
    "Use the `pr-create` skill to create a pull request for this branch.",
    "",
    `Repo: ${repoRoot}`,
    `Branch: ${branch}`,
    "Base: origin/main"
  ];
  if (isWorkPolicy()) {
    lines.push("", WORK_TITLE_REQUIREMENT);
  }
  return lines.join("\n");
}
