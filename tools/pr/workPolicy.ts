import process from "node:process";

export function isWorkPolicy(): boolean {
  const raw = process.env.WORK?.trim();
  if (!raw) {
    return false;
  }
  return raw !== "0" && raw.toLowerCase() !== "false";
}

export const WORK_TITLE_REQUIREMENT =
  "Title must start with `NOVACORE-<digits> - ` (e.g. `NOVACORE-1234 - `). Use a valid recent Jira ticket; extract the number from the branch name or commit messages.";
