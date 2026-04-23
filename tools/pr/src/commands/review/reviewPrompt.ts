import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const reviewCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type ReviewPromptVars = {
  prLine: string;
  prefetchedContextSection: string;
  hintBlock: string;
};

export function expandReviewPlaceholders(
  template: string,
  vars: ReviewPromptVars,
): string {
  return template
    .replaceAll("{{prLine}}", vars.prLine)
    .replaceAll("{{prefetchedContextSection}}", vars.prefetchedContextSection)
    .replaceAll("{{hintBlock}}", vars.hintBlock);
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
| \`commits.txt\` | One line per commit: short SHA, subject, optional body (from \`gh pr view --json commits\`) |
| \`checks.json\` | \`statusCheckRollup\` — CI/check pass-fail, job names, \`detailsUrl\` / \`targetUrl\` log links (pretty-printed) |
| \`comments.md\` | Inline review comments (\`gh api\` pull review comments): each entry has \`path:line @author\`, a \`\`\`diff\`\`\` block with the \`diff_hunk\` GitHub provides, then the comment body; plus a section for PR conversation (\`issues/…/comments\`) |
| \`files.json\` | Changed files from \`gh pr view --json files\` (pretty-printed) |
| \`diff.patch\` | Full unified diff from \`gh pr diff\` |
| \`KEY-123.md\` | One file per Jira key in the PR body (e.g. \`NOVACORE-39309.md\`): exact copy of \`references/**/{KEY}.md\` from the jira-tickets skill; if none match, \`{firstKey}.md\` holds the skill board text only (no API; optional files) |
| \`PR.md\` | **Prefetched:** current PR (\`# …\` + body). **Replace entirely** with \`# …\` review summary line + full **review comment** markdown (e.g. \`> Reviewed by Cursor\`). Both parts non-empty when done. |

Parallel subagents must also read these same paths (this workspace is shared).`;
}
