import { appendGitContext } from "../../gitContext.ts";
import { appendOpenPrsForBranch } from "../../openPrs.ts";
import { appendPullRequestTemplate } from "../../template.ts";
import { isWorkPolicy, WORK_TITLE_REQUIREMENT } from "../../workPolicy.ts";

export function buildCreatePrompt(repoRoot: string, branch: string): string {
  const lines = [
    "Use the `pr-create` skill to create a pull request for this branch.",
    "Context below was collected at prompt time. Use it as the latest state; do not re-run git or gh to gather it.",
    "",
    `Repo: ${repoRoot}`,
    `Branch: ${branch}`,
    "Base: origin/main"
  ];
  appendGitContext(lines, repoRoot);
  appendOpenPrsForBranch(lines, repoRoot, branch);
  if (isWorkPolicy()) {
    lines.push("", WORK_TITLE_REQUIREMENT);
  }
  appendPullRequestTemplate(lines, repoRoot);
  return lines.join("\n");
}
