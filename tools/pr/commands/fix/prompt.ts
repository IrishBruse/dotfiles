import { appendGhPrView } from "../../gitContext.ts";
import {
  appendReviewContext,
  type ReviewThread
} from "../../reviewContext.ts";
import { inlinedSkillLines } from "../../skillPrompt.ts";
import {
  appendWorkflowContext,
  failedChecks,
  type PrCheck
} from "../../workflowContext.ts";

export type FixPrompt = {
  prompt: string;
  failures: PrCheck[];
  unresolvedThreads: ReviewThread[];
};

export function buildFixPrompt(
  repoRoot: string,
  branch: string,
  prTarget?: string
): FixPrompt {
  const lines = [
    ...inlinedSkillLines("pr-fix"),
    "Context below was collected at prompt time. Use it as the latest state; do not re-run git or gh to gather it.",
    "",
    `Repo: ${repoRoot}`,
    `Branch: ${branch}`
  ];
  if (prTarget !== undefined && prTarget !== "") {
    lines.push(`PR: ${prTarget}`);
  }
  appendGhPrView(lines, repoRoot, prTarget);
  const checks = appendWorkflowContext(lines, repoRoot, branch, prTarget);
  const unresolvedThreads = appendReviewContext(lines, repoRoot, prTarget);

  const failures = failedChecks(checks);
  if (failures.length === 0) {
    lines.push(
      "",
      "No failed checks were reported at prompt time. If local validation is still needed, run the repo's standard checks before pushing."
    );
  }
  if (unresolvedThreads.length === 0) {
    lines.push("", "No unresolved review comments were reported at prompt time.");
  }

  return { prompt: lines.join("\n"), failures, unresolvedThreads };
}
