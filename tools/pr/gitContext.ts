import { spawnSync } from "node:child_process";

const BASE = "origin/main";

function runGit(repoRoot: string, args: string[]): string | undefined {
  const r = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024
  });
  if (r.status !== 0) {
    return undefined;
  }
  return (r.stdout ?? "").trimEnd();
}

function runGh(repoRoot: string, args: string[]): string | undefined {
  const r = spawnSync("gh", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 10 * 1024 * 1024
  });
  if (r.status !== 0) {
    return undefined;
  }
  return (r.stdout ?? "").trimEnd();
}

function section(lines: string[], heading: string, body: string | undefined): void {
  lines.push("", heading);
  if (body === undefined) {
    lines.push("(command failed)");
    return;
  }
  if (body === "") {
    lines.push("(none)");
    return;
  }
  lines.push(body);
}

export function appendGitContext(lines: string[], repoRoot: string): void {
  lines.push(
    "",
    "Git context (already collected at prompt time; do not re-run git status, git branch, git log, or git diff - this is the latest state):"
  );

  section(lines, "### git status", runGit(repoRoot, ["status"]));
  section(lines, "### git branch -vv", runGit(repoRoot, ["branch", "-vv"]));
  section(
    lines,
    `### git log ${BASE}..HEAD --oneline`,
    runGit(repoRoot, ["log", `${BASE}..HEAD`, "--oneline"])
  );
  section(
    lines,
    `### git diff ${BASE}...HEAD --stat`,
    runGit(repoRoot, ["diff", `${BASE}...HEAD`, "--stat"])
  );
  section(
    lines,
    `### git diff ${BASE}...HEAD`,
    runGit(repoRoot, ["diff", `${BASE}...HEAD`])
  );
}

export function appendGhPrView(
  lines: string[],
  repoRoot: string,
  prTarget?: string
): void {
  const args =
    prTarget !== undefined && prTarget !== ""
      ? ["pr", "view", prTarget, "--json", "number,title,body,url"]
      : ["pr", "view", "--json", "number,title,body,url"];

  const out = runGh(repoRoot, args);
  lines.push(
    "",
    "Current PR on GitHub (already collected at prompt time; do not re-run gh pr view - this is the latest state):"
  );
  section(lines, "### gh pr view --json number,title,body,url", out);
}
