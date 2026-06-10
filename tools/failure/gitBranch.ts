import { spawnSync } from "node:child_process";

/**
 * Current git branch for `cwd`, or `n/a` when not in a repo or detached.
 */
export function gitBranchForPath(cwd: string): string {
  const r = spawnSync("git", ["branch", "--show-current"], {
    cwd,
    encoding: "utf8"
  });
  if (r.status !== 0) {
    return "n/a";
  }
  const branch = (r.stdout ?? "").trim();
  return branch || "n/a";
}
