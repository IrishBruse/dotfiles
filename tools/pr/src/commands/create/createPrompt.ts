import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isJiraTitlePolicyEnabled } from "./work/jiraTitlePolicy.ts";

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
| \`PULL_REQUEST_TEMPLATE.md\` | Present only if the repo had a GitHub PR template; follow its sections in **Body.md** |
| \`Title.md\` | **You create** — PR title (non-empty when done) |
| \`Body.md\` | **You create** — full markdown PR description (non-empty when done) |`;
}

/**
 * Full prompt for \`pr create\`: template markdown, plus work appendix only when PR_TITLE_JIRA_KEY is set.
 */
export function loadCreateAgentPrompt(vars: CreatePromptVars): string {
  const template = fs.readFileSync(
    path.join(createCommandDir, "prompt.md"),
    "utf8",
  );
  let out = expandCreatePlaceholders(template, vars);
  if (isJiraTitlePolicyEnabled()) {
    const key = process.env.PR_TITLE_JIRA_KEY!.trim();
    const appendix = fs
      .readFileSync(path.join(createCommandDir, "work", "prompt.md"), "utf8")
      .replaceAll("{{JIRA_PROJECT_KEY}}", key);
    out = `${out}\n\n${appendix}`;
  }
  return out;
}
