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
