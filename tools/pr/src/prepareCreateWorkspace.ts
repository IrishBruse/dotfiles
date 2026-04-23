import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { writeJiraSkillBoardSnapshot } from "./jiraSkillContext.ts";
import { clearPrAgentWorkspaceDir, readCurrentBranch } from "./prAgentWorkspace.ts";

const GIT_BUFFER = 100 * 1024 * 1024;

/**
 * Seeds **`diff.patch`** (from `git diff origin/main`), an optional **`PULL_REQUEST_TEMPLATE.md`**,
 * and **`jira-tickets-board.md`** (jira-tickets skill snapshot when installed) at the root of `dir`.
 * **`repoRoot`** is the real Git repo (user cwd); **`dir`** is the agent temp workspace.
 * @returns Current branch name (`HEAD`) for prompts, stderr log, and the **Source branch** line in the agent prompt.
 */
export function populateCreateWorkspace(dir: string, repoRoot: string): string {
  try {
    const branch = readCurrentBranch(repoRoot);

    const r = spawnSync("git", ["diff", "origin/main"], {
      encoding: "utf8",
      cwd: repoRoot,
      maxBuffer: GIT_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (r.status !== 0) {
      const msg = (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status}`;
      throw new Error(`pr create: git diff origin/main failed: ${msg}`);
    }
    fs.writeFileSync(path.join(dir, "diff.patch"), r.stdout ?? "", "utf8");

    const templateCandidates = [
      path.join(repoRoot, ".github", "PULL_REQUEST_TEMPLATE.md"),
      path.join(repoRoot, ".github", "pull_request_template.md"),
      path.join(repoRoot, "docs", "pull_request_template.md"),
    ];
    for (const p of templateCandidates) {
      if (fs.existsSync(p)) {
        fs.copyFileSync(p, path.join(dir, "PULL_REQUEST_TEMPLATE.md"));
        break;
      }
    }
    writeJiraSkillBoardSnapshot(dir);
    return branch;
  } catch (e) {
    try {
      clearPrAgentWorkspaceDir(dir);
    } catch {
      // ignore
    }
    throw e;
  }
}
