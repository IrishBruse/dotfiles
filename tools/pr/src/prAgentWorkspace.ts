/// <reference types="node" />

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Cwd for **`git rev-parse`** / branch detection. If unset, uses **`process.cwd()`**.
 * Set to a work tree (or path inside it) when the shell is not inside a repo, e.g.
 * **`export PR_GIT_CWD=~/code/dotfiles`**
 */
export function resolvePrCliGitCwd(): string {
  const raw = process.env.PR_GIT_CWD?.trim();
  if (raw && raw !== "") {
    if (raw.startsWith("~/")) {
      return path.join(os.homedir(), raw.slice(2));
    }
    return path.resolve(raw);
  }
  return process.cwd();
}

/** Empty directory for the agent; it only writes **`PR.md`** here. */
export function prepareAgentOutputDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-out-"));
}

/**
 * `PR_PROMPT.md` next to the git root when **`PR_GIT_CWD`** resolves to a repo, else **`process.cwd()`**.
 */
export function resolvePrPromptDebugPath(): string {
  try {
    return path.join(getGitRepoRoot(resolvePrCliGitCwd()), "PR_PROMPT.md");
  } catch {
    return path.join(process.cwd(), "PR_PROMPT.md");
  }
}

/**
 * If **`printPath`** is true, one line: abs output directory path, then a blank line on stderr.
 * Otherwise no output (default unless **`--dir`** is passed).
 */
export function logAgentOutputDirPreamble(
  dir: string,
  printPath: boolean,
): void {
  if (!printPath) {
    return;
  }
  process.stderr.write(`${dir}\n\n`);
}

export function getGitRepoRoot(cwd: string): string {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const msg =
      (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status ?? 1}`;
    throw new Error(`pr: not a git repository (${msg})`);
  }
  const root = (r.stdout ?? "").trim();
  if (root === "") {
    throw new Error("pr: git rev-parse --show-toplevel returned empty path");
  }
  return path.resolve(root);
}

export function readCurrentBranch(repoRoot: string): string {
  const head = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (head.status !== 0) {
    const msg =
      (head.stderr ?? head.stdout ?? "").trim() || `exit ${head.status ?? 1}`;
    throw new Error(`pr: git rev-parse HEAD failed: ${msg}`);
  }
  const branch = (head.stdout ?? "").trim();
  if (branch === "") {
    throw new Error("pr: could not resolve current branch name");
  }
  return branch;
}
