import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/** Default `os.tmpdir()`; override with `PR_CLI_WORKSPACE_ROOT` (absolute path or `~/…`). */
export function workspaceAnchor(): string {
  const raw = process.env.PR_CLI_WORKSPACE_ROOT?.trim();
  if (raw && raw !== "") {
    if (raw.startsWith("~/")) {
      return path.join(os.homedir(), raw.slice(2));
    }
    return path.resolve(raw);
  }
  return os.tmpdir();
}

function slugSegment(s: string): string {
  const t = s.replace(/[^\w.\-]+/g, "_").replace(/^_+|_+$/g, "");
  return t === "" ? "_" : t;
}

function safeBranchSlug(branch: string): string {
  return slugSegment(branch.replace(/[/\\]+/g, "__"));
}

/**
 * Path segments that identify this repo under the tmp (or custom) anchor.
 * Uses path relative to home when the repo is under `$HOME`; otherwise a single `_abs` slug.
 */
export function repoPathSegments(repoRoot: string): string[] {
  const absRepo = path.resolve(repoRoot);
  const home = os.homedir();
  const rel = path.relative(home, absRepo);
  const normalized = rel.replace(/\\/g, "/");
  if (normalized === "" || normalized === ".") {
    return ["_repo"];
  }
  if (!normalized.startsWith("..") && !path.isAbsolute(rel)) {
    return normalized.split("/").filter(Boolean).map(slugSegment);
  }
  return ["_abs", slugSegment(absRepo.replace(/[/\\:]+/g, "_"))];
}

/** Stable agent cwd: `<anchor>/pr-cli/<repo…>/<branch>/`. */
export function resolvePrAgentWorkspaceDir(
  repoRoot: string,
  branch: string,
): string {
  return path.join(
    workspaceAnchor(),
    "pr-cli",
    ...repoPathSegments(repoRoot),
    safeBranchSlug(branch),
  );
}

export function clearPrAgentWorkspaceDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    fs.rmSync(path.join(dir, ent.name), { recursive: true, force: true });
  }
}

export function preparePrAgentWorkspace(
  repoRoot: string,
  branch: string,
): string {
  const dir = resolvePrAgentWorkspaceDir(repoRoot, branch);
  clearPrAgentWorkspaceDir(dir);
  return dir;
}

export function getGitRepoRoot(cwd: string): string {
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const msg =
      (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status ?? 1}`;
    throw new Error(`pr: not a git repository (${msg})`);
  }
  const root = (r.stdout ?? "").trim();
  if (root === "") {
    throw new Error("pr: git rev-parse --show-toplevel returned empty path");
  }
  return path.resolve(root);
}

export function readCurrentBranch(repoRoot: string): string {
  const head = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    encoding: "utf8",
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (head.status !== 0) {
    const msg =
      (head.stderr ?? head.stdout ?? "").trim() || `exit ${head.status ?? 1}`;
    throw new Error(`pr: git rev-parse HEAD failed: ${msg}`);
  }
  const branch = (head.stdout ?? "").trim();
  if (branch === "") {
    throw new Error("pr: could not resolve current branch name");
  }
  return branch;
}

export function readPrHeadBranchName(target: string): string {
  const r = spawnSync(
    "gh",
    ["pr", "view", target, "--json", "headRefName"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (r.status !== 0) {
    const msg =
      (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status ?? 1}`;
    throw new Error(`pr: gh pr view (head branch) failed: ${msg}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    throw new Error("pr: could not parse gh pr view JSON for head branch");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { headRefName?: unknown }).headRefName !== "string"
  ) {
    throw new Error("pr: missing headRefName on PR");
  }
  const b = (parsed as { headRefName: string }).headRefName.trim();
  if (b === "") {
    throw new Error("pr: empty headRefName on PR");
  }
  return b;
}

/** One line: abs workspace path, then a blank line on stderr. */
export function logAgentWorkspacePreamble(dir: string): void {
  process.stderr.write(`${dir}\n\n`);
}
