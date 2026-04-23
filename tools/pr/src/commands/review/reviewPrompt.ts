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
  return `**Review target:** \`${target}\` — PR number (current repo) or full PR URL. The CLI posts the review with this target; all PR data to analyze is already in the **workspace root** (your agent cwd).`;
}

export function buildPrefetchedContextSection(workspaceDir: string): string {
  return `## PR context (prefetched local files)

Your **current working directory** for this agent run is:

\`${workspaceDir}\`

Use the files below **in that directory** (root of the workspace). Do not run \`gh pr …\` to fetch the PR again (data is already materialized).

| Path | Contents |
|------|----------|
| \`view.json\` | PR metadata (incl. \`baseRefOid\`, \`headRefOid\`, \`url\`) from \`gh pr view\` (pretty-printed) |
| \`commits.txt\` | One line per commit: short SHA, subject, optional body (from \`gh pr view --json commits\`) |
| \`checks.json\` | \`statusCheckRollup\` — CI/check pass-fail, job names, \`detailsUrl\` / \`targetUrl\` log links (pretty-printed) |
| \`review-threads.json\` | GraphQL: line-level \`reviewThreads\` (\`isResolved\`, path, line, \`diffHunk\`, bodies) and \`forcePushTimeline\` (\`HeadRefForcePushedEvent\` before/after SHAs) |
| \`files.json\` | Changed files from \`gh pr view --json files\` (pretty-printed) |
| \`diff.patch\` | Full unified diff from \`gh pr diff\` |
| \`threads.json\` | Top-level \`reviews\` and issue \`comments\` from \`gh pr view\` (pretty-printed); use with \`review-threads.json\` for inline threads |
| \`KEY-123.md\` | One file per Jira key in the PR body (e.g. \`NOVACORE-39309.md\`): exact copy of \`references/**/{KEY}.md\` from the jira-tickets skill; if none match, \`{firstKey}.md\` holds the skill board text only (no API; optional files) |
| \`Title.md\` | **You write:** short title for the review comment (terminal preview). Required; non-empty. |
| \`Body.md\` | **You write:** full markdown for the review comment (e.g. \`> Reviewed by Cursor\` and findings). Required; non-empty. |

Parallel subagents must also read these same paths (this workspace is shared).`;
}
