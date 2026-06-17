import { appendGhPrView, appendGitContext } from "../../gitContext.ts";
import { appendOpenPrsForBranch } from "../../openPrs.ts";
import { appendPullRequestTemplate } from "../../template.ts";
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
  appendGhPrView(lines, repoRoot, prTarget);
  appendGitContext(lines, repoRoot);
  appendOpenPrsForBranch(lines, repoRoot, branch);
  if (isWorkPolicy()) {
    lines.push("", WORK_TITLE_REQUIREMENT);
  }
  appendPullRequestTemplate(lines, repoRoot);
  return lines.join("\n");
}
