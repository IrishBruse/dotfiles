import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

/** Jira-style title prefix: set `PR_TITLE_JIRA_KEY=NOVACORE` to require titles like `NOVACORE-1123 …`. */
export function jiraTitleKeyFromEnv(): string | null {
  const v = process.env.PR_TITLE_JIRA_KEY?.trim();
  return v ? v : null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function prTitleMatchesJiraKey(title: string, key: string): boolean {
  return new RegExp(`^${escapeRegex(key)}-\\d+`).test(title.trim());
}

export function tryGhPrTitle(workspace: string, pr: string): string | null {
  try {
    const out = execFileSync("gh", ["pr", "view", pr, "--json", "title"], {
      encoding: "utf8",
      cwd: workspace,
    });
    const j = JSON.parse(out) as { title: string };
    return j.title;
  } catch {
    return null;
  }
}

/** Canonical ref for gh and prompts: accepts PR numbers, org/repo#n, and github.com PR URLs. */
export function normalizePrRef(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("(") && s.endsWith(")")) {
    s = s.slice(1, -1).trim();
  }
  if (/^github\.com\//i.test(s)) {
    s = `https://${s}`;
  }
  const m = s.match(
    /^https?:\/\/(?:www\.)?github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|\?|#|$)/i,
  );
  if (m) {
    return `https://github.com/${m[1]}/${m[2]}/pull/${m[3]}`;
  }
  return s;
}

export function parseGhPrStateJson(out: string): { key: string; headOid: string } {
  const j = JSON.parse(out) as {
    headRefOid: string;
    number: number;
    baseRepository: { nameWithOwner: string };
  };
  const key = `${j.baseRepository.nameWithOwner}#${j.number}`;
  return { key, headOid: j.headRefOid };
}

/** Resolves the PR with `gh pr view` or exits if it does not exist here. */
export function requireGhPr(
  workspace: string,
  pr: string,
): { key: string; headOid: string } {
  const r = spawnSync(
    "gh",
    ["pr", "view", pr, "--json", "headRefOid,number,baseRepository"],
    { encoding: "utf8", cwd: workspace },
  );
  if (r.error) {
    process.stderr.write(`pr: could not run gh: ${r.error.message}\n`);
    process.exit(1);
  }
  if (r.status !== 0) {
    process.stderr.write(
      "pr: PR not found or not visible in this workspace — same as `gh pr view` failing here (wrong ref, repo, or auth).\n",
    );
    if (r.stderr) process.stderr.write(r.stderr);
    process.exit(1);
  }
  try {
    return parseGhPrStateJson(r.stdout ?? "");
  } catch {
    process.stderr.write("pr: could not parse gh pr view JSON\n");
    process.exit(1);
  }
}

export function ghPrCreateFromPayload(
  workspace: string,
  title: string,
  body: string,
): void {
  const bodyFile = path.join(
    os.tmpdir(),
    `pr-cli-body-${process.pid}-${Date.now()}.md`,
  );
  fs.writeFileSync(bodyFile, body, "utf8");
  const r = spawnSync(
    "gh",
    ["pr", "create", "--title", title, "--body-file", bodyFile],
    {
      cwd: workspace,
      encoding: "utf8",
      stdio: ["ignore", "inherit", "inherit"],
    },
  );
  try {
    fs.unlinkSync(bodyFile);
  } catch {
    /* ignore */
  }
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}
