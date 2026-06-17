import { appendGhPrView } from "../../gitContext.ts";
import {
  appendWorkflowContext,
  failedChecks,
  type PrCheck
} from "../../workflowContext.ts";

export type FixPrompt = {
  prompt: string;
  failures: PrCheck[];
};

export function buildFixPrompt(
  repoRoot: string,
  branch: string,
  prTarget?: string
): FixPrompt {
  const lines = [
    "Use the `pr-fix` skill to fix CI and workflow failures on this pull request.",
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

  const failures = failedChecks(checks);
  if (failures.length === 0) {
    lines.push(
      "",
      "No failed checks were reported at prompt time. If local validation is still needed, run the repo's standard checks before pushing."
    );
  }

  return { prompt: lines.join("\n"), failures };
}
