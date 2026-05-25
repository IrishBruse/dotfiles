import process from "node:process";

/**
 * When **`PR_CLI_WORK=true`**, **`pr create`** and **`pr update`** require the GitHub PR title
 * to start with **`NOVACORE-<digits>`**. Work-only appendices live in the interpolate prompts dir:
 * Work-only lines in `pr-create.md` / `pr-update.md` / `pr-review.md` use the `?work:` line prefix (via interpolate).
 * Unset or any other value — no check and those lines are omitted.
 */
export const PR_WORK_JIRA_KEY = "NOVACORE";

export function isPrCliWork(): boolean {
  return process.env.PR_CLI_WORK === "true";
}

export function assertPrTitleMatchesJiraPolicy(title: string): void {
  if (!isPrCliWork()) {
    return;
  }
  const escaped = PR_WORK_JIRA_KEY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-\\d+`);
  const t = title.trim();
  if (!re.test(t)) {
    throw new Error(
      `pr: PR title must start with ${PR_WORK_JIRA_KEY}-<digits> when PR_CLI_WORK=true (got: ${JSON.stringify(t)})`
    );
  }
}
