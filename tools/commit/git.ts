import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

export function resolveCwd(cwdArg: string | undefined): string {
  if (cwdArg === undefined || cwdArg.trim() === "") {
    return process.cwd();
  }
  return path.resolve(cwdArg);
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

export function getBranch(cwd: string): string {
  return gitOutput(cwd, ["branch", "--show-current"]);
}

export function getStagedFileList(cwd: string): string {
  return gitOutput(cwd, ["diff", "--cached", "--name-status"]);
}

export function getStagedDiff(cwd: string): string {
  return gitOutput(cwd, ["diff", "--cached"]);
}

export function getGitUserName(cwd: string): string {
  const r = spawnSync("git", ["config", "user.name"], {
    cwd,
    encoding: "utf8"
  });
  const name = (r.stdout ?? "").trim();
  if (name !== "") {
    return name;
  }
  return process.env.USER ?? process.env.LOGNAME ?? "unknown";
}
