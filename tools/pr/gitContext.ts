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

function fetchOriginMain(repoRoot: string): string {
  const r = spawnSync("git", ["fetch", "origin", "main"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  const combined = [r.stderr, r.stdout]
    .map((s) => (s ?? "").trim())
    .filter((s) => s !== "")
    .join("\n");
  if (r.status !== 0) {
    return combined || "(fetch failed)";
  }
  return combined || "(already up to date)";
}

function syncWithMain(repoRoot: string): string | undefined {
  const raw = runGit(repoRoot, [
    "rev-list",
    "--left-right",
    "--count",
    `${BASE}...HEAD`
  ]);
  if (raw === undefined) {
    return undefined;
  }
  const parts = raw.split("\t");
  if (parts.length !== 2) {
    return undefined;
  }
  const behind = Number(parts[0]);
  const ahead = Number(parts[1]);
  if (Number.isNaN(behind) || Number.isNaN(ahead)) {
    return undefined;
  }
  return `${String(behind)} commit(s) behind ${BASE}, ${String(ahead)} commit(s) ahead`;
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
  lines.push("", "Git context:");

  section(lines, "### git fetch origin main", fetchOriginMain(repoRoot));
  section(lines, "### sync with origin/main", syncWithMain(repoRoot));
  section(lines, "### git status", runGit(repoRoot, ["status"]));
  section(lines, "### git branch -vv", runGit(repoRoot, ["branch", "-vv"]));
  section(
    lines,
    `### git log ${BASE} -3 --oneline`,
    runGit(repoRoot, ["log", BASE, "-3", "--oneline"])
  );

  const aheadLog = runGit(repoRoot, ["log", `${BASE}..HEAD`, "--oneline"]);
  section(lines, `### git log ${BASE}..HEAD --oneline`, aheadLog);
  if (aheadLog !== undefined && aheadLog === "") {
    lines.push(
      "",
      `(no commits ahead of ${BASE} - nothing to PR from this branch unless you commit on a feature branch or switch branches)`
    );
  }

  section(
    lines,
    `### git log ${BASE}..HEAD --stat`,
    runGit(repoRoot, ["log", `${BASE}..HEAD`, "--stat"])
  );
  section(
    lines,
    `### git diff ${BASE} --stat`,
    runGit(repoRoot, ["diff", BASE, "--stat"])
  );
  section(lines, `### git diff ${BASE}`, runGit(repoRoot, ["diff", BASE]));
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
  lines.push("", "Current PR on GitHub:");
  section(lines, "### gh pr view --json number,title,body,url", out);
}
