import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Cwd for **`git rev-parse`** / branch detection. If unset, uses **`process.cwd()`**.
 * Set to a work tree (or path inside it) when the shell is not inside a repo, e.g.
 * **`export PR_GIT_CWD=~/code/dotfiles`**
 */
export function resolvePrCliGitCwd(): string {
  const raw = process.env.PR_GIT_CWD?.trim();
  if (raw && raw !== "") {
    if (raw.startsWith("~/")) {
      return path.join(os.homedir(), raw.slice(2));
    }
    return path.resolve(raw);
  }
  return process.cwd();
}

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

/** Path under the workspace anchor when there is no local git repo: `pr-cli/gh/<owner>/<repo>/<branch>/`. */
export function repoPathSegmentsFromGitHubSlug(nameWithOwner: string): string[] {
  const t = nameWithOwner.trim();
  const slash = t.indexOf("/");
  if (slash <= 0 || slash >= t.length - 1) {
    return ["gh", slugSegment(t === "" ? "_" : t)];
  }
  return [
    "gh",
    slugSegment(t.slice(0, slash)),
    slugSegment(t.slice(slash + 1)),
  ];
}

export function resolvePrAgentWorkspaceDirRemote(
  nameWithOwner: string,
  branch: string,
): string {
  return path.join(
    workspaceAnchor(),
    "pr-cli",
    ...repoPathSegmentsFromGitHubSlug(nameWithOwner),
    safeBranchSlug(branch),
  );
}

export function preparePrAgentWorkspaceRemote(
  nameWithOwner: string,
  branch: string,
): string {
  const dir = resolvePrAgentWorkspaceDirRemote(nameWithOwner, branch);
  clearPrAgentWorkspaceDir(dir);
  return dir;
}

function parseOwnerRepoFromGithubPrUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const m = /^\/([^/]+)\/([^/]+)\/pull\/\d/.exec(u.pathname);
    if (m) {
      return `${m[1]}/${m[2]}`;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export type PrHeadWorkspaceFromGh = {
  headBranch: string;
  /** `owner/name` for the PR head repository (fork when cross-repo). */
  nameWithOwner: string;
};

/**
 * Resolves the PR head branch and repo slug via **`gh`** (one round trip). Used for agent workspace
 * layout when **`git rev-parse`** is unavailable.
 */
export function readPrHeadWorkspaceFromGh(target: string): PrHeadWorkspaceFromGh {
  const r = spawnSync(
    "gh",
    [
      "pr",
      "view",
      target,
      "--json",
      "headRefName,headRepository,headRepositoryOwner,url",
    ],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (r.status !== 0) {
    const msg =
      (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status ?? 1}`;
    throw new Error(`pr: gh pr view (head workspace) failed: ${msg}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    throw new Error("pr: could not parse gh pr view JSON for head workspace");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("pr: invalid gh pr view JSON for head workspace");
  }
  const o = parsed as {
    headRefName?: unknown;
    headRepository?: unknown;
    headRepositoryOwner?: unknown;
    url?: unknown;
  };
  const headBranch =
    typeof o.headRefName === "string" ? o.headRefName.trim() : "";
  if (headBranch === "") {
    throw new Error("pr: missing headRefName on PR");
  }
  let nameWithOwner = "";
  const headRepo = o.headRepository;
  const ownerObj = o.headRepositoryOwner;
  if (
    typeof headRepo === "object" &&
    headRepo !== null &&
    typeof ownerObj === "object" &&
    ownerObj !== null
  ) {
    const repoName =
      typeof (headRepo as { name?: unknown }).name === "string"
        ? (headRepo as { name: string }).name.trim()
        : "";
    const login =
      typeof (ownerObj as { login?: unknown }).login === "string"
        ? (ownerObj as { login: string }).login.trim()
        : "";
    if (repoName !== "" && login !== "") {
      nameWithOwner = `${login}/${repoName}`;
    }
  }
  if (nameWithOwner === "" && typeof o.url === "string") {
    const fromUrl = parseOwnerRepoFromGithubPrUrl(o.url);
    if (fromUrl !== null) {
      nameWithOwner = fromUrl;
    }
  }
  if (nameWithOwner === "") {
    throw new Error(
      "pr: could not resolve PR repository slug from gh (no headRepository)",
    );
  }
  return { headBranch, nameWithOwner };
}

/**
 * Clears and returns the agent workspace directory for **`pr review`** / **`pr update`**: uses the
 * local git repo path when **`git rev-parse`** succeeds from **`PR_GIT_CWD`** / cwd; otherwise
 * **`pr-cli/gh/<owner>/<repo>/…`** from the PR head on GitHub.
 */
export function preparePrReviewWorkspace(target: string): string {
  const { headBranch, nameWithOwner } = readPrHeadWorkspaceFromGh(target);
  try {
    const repoRoot = getGitRepoRoot(resolvePrCliGitCwd());
    return preparePrAgentWorkspace(repoRoot, headBranch);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not a git repository")) {
      return preparePrAgentWorkspaceRemote(nameWithOwner, headBranch);
    }
    throw e;
  }
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
  return readPrHeadWorkspaceFromGh(target).headBranch;
}

/**
 * If **`printPath`** is true, one line: abs workspace path, then a blank line on stderr.
 * Otherwise no output (default unless **`--dir`** is passed).
 */
export function logAgentWorkspacePreamble(dir: string, printPath: boolean): void {
  if (!printPath) {
    return;
  }
  process.stderr.write(`${dir}\n\n`);
}
