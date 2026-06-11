import { spawnSync } from "node:child_process";

export function getRepoRoot(cwd: string): string {
  return gitOutput(cwd, ["rev-parse", "--show-toplevel"]);
}

export function hasStagedChanges(cwd: string): boolean {
  const r = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd });
  return r.status === 1;
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

function gitOutput(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw gitError(args, r.stderr ?? r.stdout ?? "");
  }
  return (r.stdout ?? "").trimEnd();
}

function runGit(cwd: string, args: string[]): void {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw gitError(args, r.stderr ?? r.stdout ?? "");
  }
}

function gitError(args: string[], output: string): Error {
  const err = output.trim();
  return new Error(err || `git ${args.join(" ")} failed`);
}
