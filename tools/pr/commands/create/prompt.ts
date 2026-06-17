import { appendOpenPrsForBranch } from "../../openPrs.ts";
import { appendPullRequestTemplate } from "../../template.ts";
import { isWorkPolicy, WORK_TITLE_REQUIREMENT } from "../../workPolicy.ts";

export function buildCreatePrompt(repoRoot: string, branch: string): string {
  const lines = [
    "Use the `pr-create` skill to create a pull request for this branch.",
    "",
    `Repo: ${repoRoot}`,
    `Branch: ${branch}`,
    "Base: origin/main"
  ];
  appendOpenPrsForBranch(lines, repoRoot, branch);
  if (isWorkPolicy()) {
    lines.push("", WORK_TITLE_REQUIREMENT);
  }
  appendPullRequestTemplate(lines, repoRoot);
  return lines.join("\n");
}
