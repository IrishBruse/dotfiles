import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { PrRepoCoords } from "./githubPrPrefetchExtra.ts";

const GH_BUFFER = 100 * 1024 * 1024;

function ghApiPaginated(
  apiPath: string,
): { ok: true; data: unknown[] } | { ok: false; error: string } {
  const r = spawnSync("gh", ["api", apiPath, "--paginate"], {
    encoding: "utf8",
    maxBuffer: GH_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const msg = (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status}`;
    return { ok: false, error: msg };
  }
  try {
    const parsed = JSON.parse(r.stdout ?? "[]") as unknown;
    return { ok: true, data: Array.isArray(parsed) ? parsed : [] };
  } catch {
    return { ok: false, error: "gh api returned non-JSON" };
  }
}

function loginOf(c: Record<string, unknown>): string {
  const u = c.user;
  if (typeof u === "object" && u !== null && "login" in u) {
    const l = (u as { login: unknown }).login;
    if (typeof l === "string") {
      return l;
    }
  }
  return "unknown";
}

function formatInlineReviewComment(c: Record<string, unknown>): string {
  const filePath = typeof c.path === "string" ? c.path : "(path unknown)";
  const line =
    typeof c.line === "number"
      ? c.line
      : typeof c.original_line === "number"
        ? c.original_line
        : "?";
  const login = loginOf(c);
  const body = typeof c.body === "string" ? c.body.trim() : "";
  const hunk = typeof c.diff_hunk === "string" ? c.diff_hunk.trimEnd() : "";

  let out = `${filePath}:${line} @${login}\n\n`;
  if (hunk !== "") {
    out += "```diff\n" + hunk + "\n```\n\n";
  }
  out += body;
  return out;
}

function formatIssueComment(c: Record<string, unknown>): string {
  const login = loginOf(c);
  const body = typeof c.body === "string" ? c.body.trim() : "";
  return `(PR conversation) @${login}\n\n${body}`;
}

/**
 * **`comments.txt`**: inline review comments (with **`diff_hunk`** in a fenced block) + issue-style PR conversation comments.
 * Uses **`gh api`** REST only (no GraphQL). Never throws; on failure writes a short error note into the file.
 */
export function writePrCommentsTxt(dir: string, coords: PrRepoCoords): void {
  const parts: string[] = [];

  const pullCommentsPath = `repos/${coords.owner}/${coords.repo}/pulls/${coords.number}/comments`;
  const pullResult = ghApiPaginated(pullCommentsPath);
  parts.push("## Inline review comments\n");
  if (pullResult.ok === false) {
    parts.push(`(could not load: ${pullResult.error})\n\n`);
  } else if (pullResult.data.length === 0) {
    parts.push("(none)\n\n");
  } else {
    for (const row of pullResult.data) {
      if (typeof row === "object" && row !== null) {
        parts.push(formatInlineReviewComment(row as Record<string, unknown>));
        parts.push("\n---\n\n");
      }
    }
  }

  const issueCommentsPath = `repos/${coords.owner}/${coords.repo}/issues/${coords.number}/comments`;
  const issueResult = ghApiPaginated(issueCommentsPath);
  parts.push("## PR conversation comments\n");
  if (issueResult.ok === false) {
    parts.push(`(could not load: ${issueResult.error})\n\n`);
  } else if (issueResult.data.length === 0) {
    parts.push("(none)\n");
  } else {
    for (const row of issueResult.data) {
      if (typeof row === "object" && row !== null) {
        parts.push(formatIssueComment(row as Record<string, unknown>));
        parts.push("\n---\n\n");
      }
    }
  }

  fs.writeFileSync(path.join(dir, "comments.txt"), parts.join(""), "utf8");
}
