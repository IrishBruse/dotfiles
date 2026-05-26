import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";

export function resolveGitCwd(): string {
  const raw = process.env.PR_GIT_CWD?.trim();
  if (!raw) {
    return process.cwd();
  }
  if (raw.startsWith("~/")) {
    return path.join(os.homedir(), raw.slice(2));
  }
  return path.resolve(raw);
}

export function getRepoRoot(cwd: string): string {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8"
  });
  if (r.status !== 0) {
    const err = (r.stderr ?? r.stdout ?? "").trim();
    throw new Error(
      err ? `not a git repository: ${err}` : "not a git repository"
    );
  }
  return (r.stdout ?? "").trim();
}
