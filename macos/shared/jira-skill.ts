import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

import { $, q } from "../../shell.ts";

const JIRA_SKILL_SOURCE =
  "/Users/econneely/git/ui-platform-workspace/.cursor/skills/jira";

const LEGACY_DIRS = [
  "home/.agents/skills/jira",
  "home/.agents/skills/jira-work",
] as const;

/** Mirror ui-platform-workspace jira skill into home/.agents/jira. */
export function syncJiraSkill(repo: string): void {
  if (!existsSync(JIRA_SKILL_SOURCE)) return;

  const dest = join(repo, "home/.agents/jira");

  $(`rsync -a --delete ${q(JIRA_SKILL_SOURCE + "/")} ${q(dest + "/")}`);

  for (const rel of LEGACY_DIRS) {
    const path = join(repo, rel);
    if (existsSync(path)) {
      rmSync(path, { recursive: true });
    }
  }
}
