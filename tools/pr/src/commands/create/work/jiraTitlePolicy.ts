/**
 * Work-only overlay: org PR titles must include a Jira-style key (`KEY-<digits>`).
 * Enabled only when PR_TITLE_JIRA_KEY is set (e.g. via direnv in employer repos).
 * Personal use: leave unset — no code path here loads work prompt files for create.
 */

export function isJiraTitlePolicyEnabled(): boolean {
  const key = process.env.PR_TITLE_JIRA_KEY;
  return key !== undefined && key.trim() !== "";
}

/** Markdown fragment inserted into review prompts when {@link isJiraTitlePolicyEnabled}. */
export function buildWorkJiraTitleSection(): string {
  if (!isJiraTitlePolicyEnabled()) {
    return "";
  }
  const key = process.env.PR_TITLE_JIRA_KEY!.trim();
  return `\n## Title policy\n\nWhen posting, ensure the PR title matches policy: it must start with \`${key}-<digits>\` if your org requires it.\n`;
}

/**
 * When {@link isJiraTitlePolicyEnabled}, require title to start with `KEY-<digits>` (project key from env).
 */
export function assertPrTitleMatchesJiraPolicy(title: string): void {
  if (!isJiraTitlePolicyEnabled()) {
    return;
  }
  const key = process.env.PR_TITLE_JIRA_KEY!.trim();
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-\\d+`);
  const t = title.trim();
  if (!re.test(t)) {
    throw new Error(
      `pr: title must start with ${key}-<digits> when PR_TITLE_JIRA_KEY is set (got: ${JSON.stringify(t)})`,
    );
  }
}
