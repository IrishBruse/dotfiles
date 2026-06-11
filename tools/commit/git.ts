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

export function hasStagedChanges(cwd: string): boolean {
  const r = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd });
  return r.status === 1;
}

function gitOutput(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    const err = (r.stderr ?? r.stdout ?? "").trim();
    throw new Error(err || `git ${args.join(" ")} failed`);
  }
  return (r.stdout ?? "").trimEnd();
}

export function getStagedFileList(cwd: string): string {
  return gitOutput(cwd, ["diff", "--cached", "--name-status"]);
}

export function getStagedDiff(cwd: string): string {
  return gitOutput(cwd, ["diff", "--cached"]);
}

export function unstageAll(cwd: string): void {
  runGit(cwd, ["reset", "HEAD"]);
}

export function stagePaths(cwd: string, paths: string[]): void {
  if (paths.length === 0) {
    return;
  }
  runGit(cwd, ["add", "--", ...paths]);
}

export function createCommit(cwd: string, message: string): void {
  runGit(cwd, ["commit", "-m", message]);
}

function runGit(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    const err = (r.stderr ?? r.stdout ?? "").trim();
    throw new Error(err || `git ${args.join(" ")} failed`);
  }
}
