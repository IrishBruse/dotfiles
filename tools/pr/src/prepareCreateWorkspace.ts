import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GIT_BUFFER = 100 * 1024 * 1024;

function copyIfExists(from: string, to: string): void {
  if (fs.existsSync(from)) {
    fs.copyFileSync(from, to);
  }
}

/**
 * Seeds **`branch.txt`**, **`diff.patch`** (from `git diff origin/main`), and an optional **`PULL_REQUEST_TEMPLATE.md`**
 * at the root of `dir`. **`repoRoot`** is the real Git repo (user cwd); **`dir`** is the agent temp workspace.
 * @returns Current branch name (`HEAD`) for prompts and logging.
 */
export function populateCreateWorkspace(dir: string, repoRoot: string): string {
  try {
    const head = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (head.status !== 0) {
      const msg = (head.stderr ?? head.stdout ?? "").trim() || `exit ${head.status}`;
      throw new Error(`pr create: git rev-parse HEAD failed: ${msg}`);
    }
    const branch = (head.stdout ?? "").trim();
    if (branch === "") {
      throw new Error("pr create: could not resolve current branch name");
    }
    fs.writeFileSync(path.join(dir, "branch.txt"), `${branch}\n`, "utf8");

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
        copyIfExists(p, path.join(dir, "PULL_REQUEST_TEMPLATE.md"));
        break;
      }
    }
    return branch;
  } catch (e) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    throw e;
  }
}
