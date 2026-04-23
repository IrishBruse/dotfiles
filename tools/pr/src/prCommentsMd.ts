import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import type { PrRepoCoords } from "./githubPrPrefetchExtra.ts";

function ghApiPaginatedAsync(
  apiPath: string,
): Promise<{ ok: true; data: unknown[] } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const child = spawn("gh", ["api", apiPath, "--paginate"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => {
      out += c;
    });
    child.stderr.on("data", (c: string) => {
      err += c;
    });
    child.on("error", (e) => {
      resolve({ ok: false, error: e.message });
    });
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          error: (err || out).trim() || `exit ${code}`,
        });
        return;
      }
      try {
        const parsed = JSON.parse(out || "[]") as unknown;
        resolve({
          ok: true,
          data: Array.isArray(parsed) ? parsed : [],
        });
      } catch {
        resolve({ ok: false, error: "gh api returned non-JSON" });
      }
    });
  });
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

function buildCommentsMd(
  pullResult: { ok: true; data: unknown[] } | { ok: false; error: string },
  issueResult: { ok: true; data: unknown[] } | { ok: false; error: string },
): string {
  const parts: string[] = [];

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

  return parts.join("");
}

/**
 * **`comments.md`**: inline review comments (with **`diff_hunk`** in a fenced block) + issue-style PR conversation comments.
 * Uses **`gh api`** REST only (no GraphQL). Fetches both endpoints in parallel. Never throws; on failure writes a short error note into the file.
 */
export async function writePrCommentsMdAsync(
  dir: string,
  coords: PrRepoCoords,
): Promise<void> {
  const pullCommentsPath = `repos/${coords.owner}/${coords.repo}/pulls/${coords.number}/comments`;
  const issueCommentsPath = `repos/${coords.owner}/${coords.repo}/issues/${coords.number}/comments`;
  const [pullResult, issueResult] = await Promise.all([
    ghApiPaginatedAsync(pullCommentsPath),
    ghApiPaginatedAsync(issueCommentsPath),
  ]);
  fs.writeFileSync(
    path.join(dir, "comments.md"),
    buildCommentsMd(pullResult, issueResult),
    "utf8",
  );
}
