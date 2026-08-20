import { spawnSync } from "node:child_process";

export interface Change {
  status: "A" | "M" | "D" | "R";
  path: string;
  previousPath?: string;
}

export interface Slice {
  paths: string[];
  previousPaths: string[];
  message: string;
}

export function repoRoot(cwd: string): string {
  return gitOut(cwd, ["rev-parse", "--show-toplevel"]);
}

export function isDirty(cwd: string): boolean {
  const r = spawnSync("git", ["status", "--porcelain"], { cwd, encoding: "utf8" });
  return (r.stdout ?? "").trim() !== "";
}

export function hasUpstream(cwd: string): boolean {
  return spawnSync("git", ["rev-parse", "--abbrev-ref", "@{u}"], { cwd }).status === 0;
}

export function isAhead(cwd: string): boolean {
  const r = spawnSync("git", ["rev-list", "--count", "@{u}..HEAD"], {
    cwd,
    encoding: "utf8"
  });
  if (r.status !== 0) {
    return false;
  }
  return Number.parseInt((r.stdout ?? "").trim(), 10) > 0;
}

export function listChanges(cwd: string): Change[] {
  const named = parseNameStatus(gitOut(cwd, ["diff", "HEAD", "--name-status"]));
  const extra = gitOut(cwd, ["ls-files", "--others", "--exclude-standard"]);
  for (const path of extra.split("\n")) {
    if (path !== "") {
      named.push({ status: "A", path });
    }
  }
  return named;
}

export function commitSlices(cwd: string, slices: Slice[]): void {
  gitRun(cwd, ["reset", "HEAD"]);
  for (const slice of slices) {
    gitRun(cwd, ["add", "--", ...slice.previousPaths, ...slice.paths]);
    gitRun(cwd, ["commit", "-m", slice.message]);
  }
}

export function pushBranch(cwd: string): void {
  gitRun(cwd, ["push", "-u", "origin", "HEAD"]);
}

function parseNameStatus(text: string): Change[] {
  const files: Change[] = [];
  for (const line of text.split("\n")) {
    if (line === "") {
      continue;
    }
    const parts = line.split("\t");
    const code = parts[0] ?? "";
    if (code.startsWith("R") || code.startsWith("C")) {
      const previousPath = parts[1];
      const path = parts[2];
      if (previousPath && path) {
        files.push({ status: "R", path, previousPath });
      }
      continue;
    }
    const path = parts[1];
    if (path) {
      files.push({ status: code[0] as Change["status"], path });
    }
  }
  return files;
}

function gitOut(cwd: string, args: string[]): string {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error((r.stderr ?? r.stdout ?? "").trim() || `git ${args.join(" ")} failed`);
  }
  return (r.stdout ?? "").trimEnd();
}

function gitRun(cwd: string, args: string[]): void {
  gitOut(cwd, args);
}
