import process from "node:process";

/**
 * When **`PR_TITLE_JIRA_KEY`** is set (e.g. via direnv at work), **`pr create`** and **`pr update`**
 * require the GitHub PR title to start with **`KEY-<digits>`** (e.g. **`NOVACORE-123`**).
 * Leave unset for personal repos — no check.
 */
export function isJiraTitlePolicyEnabled(): boolean {
  const key = process.env.PR_TITLE_JIRA_KEY;
  return typeof key === "string" && key.trim() !== "";
}

function jiraProjectKey(): string {
  return process.env.PR_TITLE_JIRA_KEY!.trim();
}

/** Markdown appended to create/update agent prompts when {@link isJiraTitlePolicyEnabled}. */
export function workJiraTitlePromptSection(): string {
  if (!isJiraTitlePolicyEnabled()) {
    return "";
  }
  const key = jiraProjectKey();
  return (
    `\n## PR title (work policy)\n\n` +
    `The \`# …\` title line in **PR.md** must start with **` +
    `\`${key}-<digits>\`** (example: \`${key}-123\`). The CLI will reject anything else.\n`
  );
}

export function assertPrTitleMatchesJiraPolicy(title: string): void {
  if (!isJiraTitlePolicyEnabled()) {
    return;
  }
  const key = jiraProjectKey();
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-\\d+`);
  const t = title.trim();
  if (!re.test(t)) {
    throw new Error(
      `pr: PR title must start with ${key}-<digits> when PR_TITLE_JIRA_KEY is set (got: ${JSON.stringify(t)})`,
    );
  }
}
