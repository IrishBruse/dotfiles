import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { workJiraTitlePromptSection } from "../../jiraTitlePolicy.ts";

const createCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type CreatePromptVars = {
  repoCwdLine: string;
  branchLine: string;
  prefetchedContextSection: string;
};

export function expandCreatePlaceholders(
  template: string,
  vars: CreatePromptVars,
): string {
  return template
    .replaceAll("{{repoCwdLine}}", vars.repoCwdLine)
    .replaceAll("{{branchLine}}", vars.branchLine)
    .replaceAll("{{prefetchedContextSection}}", vars.prefetchedContextSection);
}

export function buildCreateBranchLine(branch: string): string {
  return `**Source branch:** \`${branch}\` — the CLI runs \`gh pr create\` from the **repository directory** (see below), so the new PR’s head is **this branch**. There is no GitHub PR on this branch yet.`;
}

export function buildCreateRepoCwdLine(repoRoot: string): string {
  return `**Repository (\`gh pr create\` cwd):** \`${repoRoot}\` — same path the CLI printed to stderr. Git operations for the diff and branch are from this tree.`;
}

export function buildCreatePrefetchedContextSection(
  workspaceDir: string,
): string {
  return `## Create context (prefetched local files)

Your **current working directory** for this agent run is:

\`${workspaceDir}\`

Use the files below **in that directory** (workspace root). They were copied or generated from the real repo; do not run \`gh pr …\` (no PR exists yet).

| Path | Contents |
|------|----------|
| \`branch.txt\` | Current branch name (\`git rev-parse --abbrev-ref HEAD\` in the repo) — the PR head ref |
| \`diff.patch\` | \`git diff origin/main\` from the repo — **source of truth** for what will ship |
| \`PULL_REQUEST_TEMPLATE.md\` | Copied from the repo if a GitHub PR template exists; mirror its structure in the **body** of **PR.md** when present |
| \`PR.md\` | **You create:** first line \`# <title>\`, blank line, then full body (markdown). Both non-empty. |

If parallel subagents are used, they read these same paths (this workspace is shared).`;
}

export function loadCreateAgentPrompt(vars: CreatePromptVars): string {
  const template = fs.readFileSync(
    path.join(createCommandDir, "prompt.md"),
    "utf8",
  );
  return expandCreatePlaceholders(template, vars) + workJiraTitlePromptSection();
}
