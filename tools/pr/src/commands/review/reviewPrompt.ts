import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWorkJiraTitleSection } from "../create/work/jiraTitlePolicy.ts";

const reviewCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type ReviewPromptVars = {
  prLine: string;
  prefetchedContextSection: string;
  hintBlock: string;
  /** Non-empty only when PR_TITLE_JIRA_KEY is set (work overlay); see {@link buildWorkJiraTitleSection}. */
  workJiraTitleSection: string;
};

export function expandReviewPlaceholders(
  template: string,
  vars: ReviewPromptVars,
): string {
  return template
    .replaceAll("{{prLine}}", vars.prLine)
    .replaceAll("{{prefetchedContextSection}}", vars.prefetchedContextSection)
    .replaceAll("{{hintBlock}}", vars.hintBlock)
    .replaceAll("{{workJiraTitleSection}}", vars.workJiraTitleSection);
}

export function loadReviewAgentPrompt(vars: ReviewPromptVars): string {
  const template = fs.readFileSync(
    path.join(reviewCommandDir, "prompt.md"),
    "utf8",
  );
  return expandReviewPlaceholders(template, vars);
}

export function buildPrLine(target: string): string {
  return `**Review target:** \`${target}\` — PR number (current repo) or full PR URL. The CLI posts the review with this target; all PR data to analyze is already under \`context/\` in your workspace.`;
}

export function buildPrefetchedContextSection(workspaceDir: string): string {
  return `## PR context (prefetched local files)

Your **current working directory** for this agent run is:

\`${workspaceDir}\`

Use the files below **relative to that directory**. Do not run \`gh pr …\` to fetch the PR again (data is already materialized).

| Path | Contents |
|------|----------|
| \`context/view.json\` | PR metadata from \`gh pr view --json number,title,author,baseRefName,headRefName,body,state,labels,reviewRequests\` |
| \`context/files.json\` | Changed files from \`gh pr view --json files\` |
| \`context/diff.patch\` | Full unified diff from \`gh pr diff\` |
| \`context/threads.json\` | \`reviews\` and \`comments\` from \`gh pr view --json reviews,comments\` |

Parallel subagents must also read these same paths (this workspace is shared).`;
}
