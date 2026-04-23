import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { workJiraTitlePromptSection } from "../../jiraTitlePolicy.ts";

const createCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type CreatePromptVars = {
  branchLine: string;
  prefetchedContextSection: string;
  hintBlock: string;
};

export function expandCreatePlaceholders(
  template: string,
  vars: CreatePromptVars,
): string {
  return template
    .replaceAll("{{branchLine}}", vars.branchLine)
    .replaceAll("{{prefetchedContextSection}}", vars.prefetchedContextSection)
    .replaceAll("{{hintBlock}}", vars.hintBlock);
}

export function buildCreateBranchLine(branch: string): string {
  return `**Source branch:** \`${branch}\` — the CLI runs \`gh pr create\` from the **repository directory** you started \`pr\` in, so the new PR’s head is **this branch**. There is no GitHub PR on this branch yet.`;
}

export function buildCreatePrefetchedContextSection(workspaceDir: string): string {
  return `## Workspace (prefetched by the CLI)

Your **current working directory** for this agent run is:

\`${workspaceDir}\`

Use the files below **in that directory** (workspace root).

| Path | Contents |
|------|----------|
| \`branch.txt\` | Current branch name (\`git rev-parse --abbrev-ref HEAD\` from the user’s repo) — same as the PR head ref |
| \`diff.patch\` | \`git diff origin/main\` from the user’s repo — primary change summary |
| \`PULL_REQUEST_TEMPLATE.md\` | Present only if the repo had a GitHub PR template; follow its sections in the **body** of **PR.md** |
| \`PR.md\` | **You create** — \`# \` + PR title line, blank line, then full markdown description (both non-empty) |`;
}

export function loadCreateAgentPrompt(vars: CreatePromptVars): string {
  const template = fs.readFileSync(
    path.join(createCommandDir, "prompt.md"),
    "utf8",
  );
  return expandCreatePlaceholders(template, vars) + workJiraTitlePromptSection();
}
