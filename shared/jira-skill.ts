import { existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { $, q } from "../shell.ts";

const LEGACY_DIRS = [
  "home/.agents/jira",
  "home/.agents/skills/jira-work",
] as const;

function workJiraSkillDest(): string {
  return join(homedir(), "git/ui-platform-workspace/.cursor/skills/jira");
}

/** Mirror dotfiles jira skill into ui-platform-workspace. */
export function syncJiraSkill(repo: string): void {
  const source = join(repo, "home/.agents/skills/jira");
  if (!existsSync(source)) return;

  const dest = workJiraSkillDest();
  const workspaceRoot = dirname(dirname(dirname(dest)));
  if (!existsSync(workspaceRoot)) return;

  mkdirSync(dirname(dest), { recursive: true });
  $(`rsync -a --delete ${q(source + "/")} ${q(dest + "/")}`);

  for (const rel of LEGACY_DIRS) {
    const path = join(repo, rel);
    if (existsSync(path)) {
      rmSync(path, { recursive: true });
    }
  }
}
