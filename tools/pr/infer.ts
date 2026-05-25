import { spawnSync } from "node:child_process";

import { runCreate } from "./commands/create/index.ts";
import { runUpdate } from "./commands/update/index.ts";

/**
 * True for browser-style PR links: path contains `/pull/<digits>`. Works for github.com and GitHub
 * Enterprise hosts.
 */
export function looksLikeGitHubPullRequestUrl(s: string): boolean {
  const t = s.trim();
  if (t === "" || t.startsWith("-")) {
    return false;
  }
  try {
    const u = new URL(t);
    return /\/pull\/\d+(\/|$|\?|#)/.test(u.pathname);
  } catch {
    return false;
  }
}

function truncateOneLine(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) {
    return t;
  }
  return `${t.slice(0, max - 1)}…`;
}

/** Inferred `pr <url>`: one-line banner before `pr review` runs. */
export function printInferReviewLine(prUrl: string): void {
  console.log(`Reviewing pull request — ${truncateOneLine(prUrl.trim(), 200)}`);
}

type CurrentBranchPr = { number: number; url: string | undefined };

function getOpenPrOnCurrentBranch(): CurrentBranchPr | null {
  const result = spawnSync(
    "gh",
    ["pr", "view", "--json", "number,url"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(result.stdout ?? "{}");
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "number" in parsed &&
      typeof (parsed as { number: unknown }).number === "number"
    ) {
      const p = parsed as { number: number; url?: unknown };
      const url =
        typeof p.url === "string" && p.url.length > 0 ? p.url : undefined;
      return { number: p.number, url };
    }
  } catch {
    return null;
  }
  return null;
}

function inferUpdateLine(pr: CurrentBranchPr): string {
  if (pr.url !== undefined) {
    return `Updating PR #${String(pr.number)} — ${truncateOneLine(pr.url, 200)}`;
  }
  return `Updating PR #${String(pr.number)} title and body for the current branch.`;
}

export function inferAndRun(restArgs: string[]): void {
  const pr = getOpenPrOnCurrentBranch();
  if (pr !== null) {
    console.log(inferUpdateLine(pr));
    runUpdate(restArgs);
    return;
  }
  console.log("Creating a new pull request from the current branch…");
  runCreate(restArgs);
}
