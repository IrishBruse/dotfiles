import { spawnSync } from "node:child_process";

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

export function getCurrentBranch(repoRoot: string): string {
  const r = spawnSync("git", ["branch", "--show-current"], {
    cwd: repoRoot,
    encoding: "utf8"
  });
  const branch = (r.stdout ?? "").trim();
  if (r.status !== 0 || branch === "") {
    throw new Error("could not read current branch");
  }
  return branch;
}
