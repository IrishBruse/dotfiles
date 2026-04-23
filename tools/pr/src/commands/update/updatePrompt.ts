import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { workJiraTitlePromptSection } from "../../jiraTitlePolicy.ts";

const updateCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type UpdatePromptVars = {
  prLine: string;
  prefetchedContextSection: string;
};

export function expandUpdatePlaceholders(
  template: string,
  vars: UpdatePromptVars,
): string {
  return template
    .replaceAll("{{prLine}}", vars.prLine)
    .replaceAll("{{prefetchedContextSection}}", vars.prefetchedContextSection);
}

export function loadUpdateAgentPrompt(vars: UpdatePromptVars): string {
  const template = fs.readFileSync(
    path.join(updateCommandDir, "prompt.md"),
    "utf8",
  );
  return expandUpdatePlaceholders(template, vars) + workJiraTitlePromptSection();
}

export function buildUpdatePrLine(target: string): string {
  return `**PR to update:** \`${target}\` — number or URL. The CLI runs \`gh pr edit\` with your final **title** and **body**; prefetched files are in the **workspace root**.`;
}

export function buildUpdatePrefetchedContextSection(
  workspaceDir: string,
): string {
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
| \`PR.md\` | **Prefetched:** current PR (\`# …\` + body). **Replace** with new \`# <title>\` and full new body: keep what is still true, revise where the diff or review context demands. Title and body must be non-empty when you finish. |

Parallel subagents must also read these same paths (this workspace is shared).`;
}
