import { spawnSync } from "node:child_process";

export type ReviewComment = {
  author: string;
  body: string;
  path: string;
  line: number | null;
  url: string;
};

export type ReviewThread = {
  isResolved: boolean;
  path: string;
  line: number | null;
  comments: ReviewComment[];
};

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
  const out = (r.stdout ?? "").trimEnd();
  return out === "" ? undefined : out;
}

function section(
  lines: string[],
  heading: string,
  body: string | undefined
): void {
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

function parseRepoSlug(
  raw: string | undefined
): { owner: string; name: string } | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }
  const row = parsed as Record<string, unknown>;
  const owner =
    typeof row.owner === "object" &&
    row.owner !== null &&
    typeof (row.owner as Record<string, unknown>).login === "string"
      ? (row.owner as Record<string, unknown>).login
      : undefined;
  const name = typeof row.name === "string" ? row.name : undefined;
  if (owner === undefined || name === undefined) {
    return undefined;
  }
  return { owner, name };
}

function parsePrNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }
  const number = (parsed as Record<string, unknown>).number;
  return typeof number === "number" ? number : undefined;
}

function parseReviewThreads(raw: string | undefined): ReviewThread[] | undefined {
  if (raw === undefined) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) {
    return undefined;
  }
  const data = (parsed as Record<string, unknown>).data;
  if (typeof data !== "object" || data === null) {
    return undefined;
  }
  const repository = (data as Record<string, unknown>).repository;
  if (typeof repository !== "object" || repository === null) {
    return undefined;
  }
  const pullRequest = (repository as Record<string, unknown>).pullRequest;
  if (typeof pullRequest !== "object" || pullRequest === null) {
    return undefined;
  }
  const reviewThreads = (pullRequest as Record<string, unknown>).reviewThreads;
  if (typeof reviewThreads !== "object" || reviewThreads === null) {
    return undefined;
  }
  const nodes = (reviewThreads as Record<string, unknown>).nodes;
  if (!Array.isArray(nodes)) {
    return undefined;
  }

  const out: ReviewThread[] = [];
  for (const node of nodes) {
    if (typeof node !== "object" || node === null) {
      continue;
    }
    const row = node as Record<string, unknown>;
    const isResolved = row.isResolved === true;
    const path = typeof row.path === "string" ? row.path : "";
    const line = typeof row.line === "number" ? row.line : null;
    const commentsRaw =
      typeof row.comments === "object" && row.comments !== null
        ? (row.comments as Record<string, unknown>).nodes
        : undefined;
    if (!Array.isArray(commentsRaw)) {
      continue;
    }
    const comments: ReviewComment[] = [];
    for (const commentNode of commentsRaw) {
      if (typeof commentNode !== "object" || commentNode === null) {
        continue;
      }
      const comment = commentNode as Record<string, unknown>;
      const author =
        typeof comment.author === "object" &&
        comment.author !== null &&
        typeof (comment.author as Record<string, unknown>).login === "string"
          ? (comment.author as Record<string, unknown>).login
          : "unknown";
      const body = typeof comment.body === "string" ? comment.body.trim() : "";
      const commentPath =
        typeof comment.path === "string" ? comment.path : path;
      const commentLine =
        typeof comment.line === "number" ? comment.line : line;
      const url = typeof comment.url === "string" ? comment.url : "";
      if (body === "") {
        continue;
      }
      comments.push({
        author,
        body,
        path: commentPath,
        line: commentLine,
        url
      });
    }
    if (comments.length === 0) {
      continue;
    }
    out.push({ isResolved, path, line, comments });
  }
  return out;
}

function fetchReviewThreads(
  repoRoot: string,
  prTarget?: string
): ReviewThread[] | undefined {
  const repoSlug = parseRepoSlug(
    runGh(repoRoot, ["repo", "view", "--json", "owner,name"])
  );
  if (repoSlug === undefined) {
    return undefined;
  }

  const prArgs =
    prTarget !== undefined && prTarget !== ""
      ? ["pr", "view", prTarget, "--json", "number"]
      : ["pr", "view", "--json", "number"];
  const prNumber = parsePrNumber(runGh(repoRoot, prArgs));
  if (prNumber === undefined) {
    return undefined;
  }

  const query = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          isResolved
          path
          line
          comments(first: 20) {
            nodes {
              body
              url
              path
              line
              author { login }
            }
          }
        }
      }
    }
  }
}`.trim();

  const raw = runGh(repoRoot, [
    "api",
    "graphql",
    "-f",
    `query=${query}`,
    "-f",
    `owner=${repoSlug.owner}`,
    "-f",
    `name=${repoSlug.name}`,
    "-F",
    `number=${String(prNumber)}`
  ]);
  return parseReviewThreads(raw);
}

function formatLocation(thread: ReviewThread): string {
  if (thread.path === "") {
    return "(no file)";
  }
  if (thread.line === null) {
    return thread.path;
  }
  return `${thread.path}:${String(thread.line)}`;
}

function formatThread(thread: ReviewThread): string {
  const lines = [`#### ${formatLocation(thread)}`];
  for (const comment of thread.comments) {
    lines.push(`- @${comment.author}: ${comment.body}`);
    if (comment.url !== "") {
      lines.push(`  url: ${comment.url}`);
    }
  }
  return lines.join("\n");
}

export function unresolvedThreads(threads: ReviewThread[]): ReviewThread[] {
  return threads.filter((thread) => !thread.isResolved);
}

export function appendReviewContext(
  lines: string[],
  repoRoot: string,
  prTarget?: string
): ReviewThread[] {
  lines.push("", "Pull request review comments:");
  const threads = fetchReviewThreads(repoRoot, prTarget);
  if (threads === undefined) {
    section(lines, "### unresolved review threads", undefined);
    return [];
  }

  const open = unresolvedThreads(threads);
  if (open.length === 0) {
    section(lines, "### unresolved review threads", "(none)");
    return [];
  }

  lines.push("", `### unresolved review threads (${String(open.length)})`);
  for (const thread of open) {
    lines.push("", formatThread(thread));
  }
  return open;
}
