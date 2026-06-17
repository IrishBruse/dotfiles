import { isWorkPolicy, WORK_TITLE_REQUIREMENT } from "../../workPolicy.ts";

export function buildUpdatePrompt(
  repoRoot: string,
  branch: string,
  prTarget?: string
): string {
  const lines = [
    "Use the `pr-update` skill to refresh this pull request title and body.",
    "",
    `Repo: ${repoRoot}`,
    `Branch: ${branch}`
  ];
  if (prTarget !== undefined && prTarget !== "") {
    lines.push(`PR: ${prTarget}`);
  }
  if (isWorkPolicy()) {
    lines.push("", WORK_TITLE_REQUIREMENT);
  }
  return lines.join("\n");
}
