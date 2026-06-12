import { spawnSync } from "node:child_process";

export function getRepoRoot(cwd: string): string {
  return gitOutput(cwd, ["rev-parse", "--show-toplevel"]);
}

export function hasStagedChanges(cwd: string): boolean {
  const r = spawnSync("git", ["diff", "--cached", "--quiet"], { cwd });
  return r.status === 1;
}

export function hasUnstagedChanges(cwd: string): boolean {
  const diff = spawnSync("git", ["diff", "--quiet"], { cwd });
  if (diff.status === 1) {
    return true;
  }
  const untracked = spawnSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd,
    encoding: "utf8"
  });
  return (untracked.stdout ?? "").trim().length > 0;
}

export function getStagedFileList(cwd: string): string {
  return gitOutput(cwd, ["diff", "--cached", "--name-status"]);
}

export function getUnstagedFileList(cwd: string): string {
  const diff = gitOutput(cwd, ["diff", "--name-status"]);
  const untracked = gitOutput(cwd, ["ls-files", "--others", "--exclude-standard"]);
  const untrackedLines = untracked
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((path) => `A\t${path}`);
  return [diff, ...untrackedLines].filter((line) => line !== "").join("\n");
}

export function getStagedDiff(cwd: string): string {
  return gitOutput(cwd, ["diff", "--cached"]);
}

export function getUnstagedDiff(cwd: string): string {
  return gitOutput(cwd, ["diff"]);
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

export function hasUnpushedCommits(cwd: string): boolean {
  const r = spawnSync("git", ["rev-list", "--count", "@{u}..HEAD"], {
    cwd,
    encoding: "utf8"
  });
  if (r.status !== 0) {
    return false;
  }
  const count = Number.parseInt((r.stdout ?? "").trim(), 10);
  return Number.isFinite(count) && count > 0;
}

export function pushBranch(cwd: string): void {
  runGit(cwd, ["push"]);
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
