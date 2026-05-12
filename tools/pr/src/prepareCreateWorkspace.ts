import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  collectJiraKeyMarkdownFiles,
  readJiraSkillBoardText,
} from "./jiraSkillContext.ts";
import { readCurrentBranch } from "./prAgentWorkspace.ts";

const GIT_BUFFER = 100 * 1024 * 1024;

/**
 * Builds the same prefetch bundle as the old create workspace: **`diff.patch`** (`git diff origin/main`),
 * optional **`PULL_REQUEST_TEMPLATE.md`**, Jira board + **`{KEY}.md`** files.
 * @returns Current branch and file contents keyed by basename (for the agent prompt).
 */
export function fetchCreatePrefetchFiles(repoRoot: string): {
  branch: string;
  files: Record<string, string>;
} {
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

  const files: Record<string, string> = {};
  files["diff.patch"] = r.stdout ?? "";

  const templateCandidates = [
    path.join(repoRoot, ".github", "PULL_REQUEST_TEMPLATE.md"),
    path.join(repoRoot, ".github", "pull_request_template.md"),
    path.join(repoRoot, "docs", "pull_request_template.md"),
  ];
  let templateText = "";
  for (const p of templateCandidates) {
    if (fs.existsSync(p)) {
      templateText = fs.readFileSync(p, "utf8");
      files["PULL_REQUEST_TEMPLATE.md"] = templateText;
      break;
    }
  }

  const board = readJiraSkillBoardText();
  if (board !== null) {
    files["jira-tickets-board.md"] = board;
  }
  Object.assign(files, collectJiraKeyMarkdownFiles(branch, templateText));

  return { branch, files };
}
