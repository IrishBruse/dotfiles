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
| \`commits.json\` | Commit list (\`commits\`, SHAs, messages, dates) plus \`compareRangeUrl\` (\`base...head\`) from \`gh pr view\` |
| \`checks.json\` | \`statusCheckRollup\` — CI/check pass-fail, job names, \`detailsUrl\` / \`targetUrl\` log links (pretty-printed) |
| \`review-threads.json\` | GraphQL: line-level \`reviewThreads\` (\`isResolved\`, path, line, \`diffHunk\`, bodies) and \`forcePushTimeline\` (\`HeadRefForcePushedEvent\` before/after SHAs) |
| \`files.json\` | Changed files from \`gh pr view --json files\` (pretty-printed) |
| \`diff.patch\` | Full unified diff from \`gh pr diff\` |
| \`threads.json\` | Top-level \`reviews\` and issue \`comments\` from \`gh pr view\` (pretty-printed); use with \`review-threads.json\` for inline threads |
| \`jira.md\` | If the PR body mentions Jira keys (\`KEY-123\`): ticket text from the **jira-tickets** skill \`references/**\` files, or the skill board \`SKILL.md\` fallback (no API; optional file) |
| \`Title.md\` | **You write:** short title for the review comment (terminal preview). Required; non-empty. |
| \`Body.md\` | **You write:** full markdown for the review comment (e.g. \`> Reviewed by Cursor\` and findings). Required; non-empty. |

Parallel subagents must also read these same paths (this workspace is shared).`;
}
