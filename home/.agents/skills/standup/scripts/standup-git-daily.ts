#!/usr/bin/env -S node --experimental-strip-types
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

const TARGET_DIR = process.env.STANDUP_GIT_ROOT ?? `${process.env.HOME ?? ""}/git`;
const DAY_MS = 24 * 60 * 60 * 1000;

type GhPr = {
  number: number;
  title: string;
  state: string;
  isDraft: boolean;
  updatedAt: string;
  url: string;
  mergedAt: string | null;
};

function blue(s: string): string {
  return `\u001b[1;34m${s}\u001b[0m`;
}
function green(s: string): string {
  return `\u001b[1;32m${s}\u001b[0m`;
}
function gray(s: string): string {
  return `\u001b[0;90m${s}\u001b[0m`;
}
function red(s: string): string {
  return `\u001b[1;31m${s}\u001b[0m`;
}

function findGitDirs(root: string): string[] {
  const r = spawnSync("find", [root, "-maxdepth", "3", "-name", ".git", "-type", "d"], {
    encoding: "utf8",
  });
  if (r.status !== 0 || !r.stdout) {
    return [];
  }
  return r.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function gitConfig(repo: string, key: string): string {
  const r = spawnSync("git", ["-C", repo, "config", key], { encoding: "utf8" });
  return (r.stdout ?? "").trim();
}

function gitLogSince(repo: string, author: string): string {
  const r = spawnSync(
    "git",
    ["-C", repo, "log", "--since=1 day ago", "--oneline", "--author", author],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    return "";
  }
  return (r.stdout ?? "").trimEnd();
}

function getOriginUrl(repo: string): string {
  const r = spawnSync("git", ["-C", repo, "remote", "get-url", "origin"], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    return "";
  }
  return (r.stdout ?? "").trim();
}

function isGithubOrigin(url: string): boolean {
  return url.includes("github.com");
}

function ghAvailable(): boolean {
  const r = spawnSync("gh", ["auth", "status"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return r.status === 0;
}

function parsePrListJson(raw: string): GhPr[] {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return [];
  }
  if (!Array.isArray(data)) {
    return [];
  }
  const out: GhPr[] = [];
  for (const row of data) {
    if (typeof row !== "object" || row === null) {
      continue;
    }
    const o = row as Record<string, unknown>;
    const number = o.number;
    const title = o.title;
    const state = o.state;
    const isDraft = o.isDraft;
    const updatedAt = o.updatedAt;
    const url = o.url;
    const mergedAtRaw = o.mergedAt;
    if (
      typeof number !== "number" ||
      typeof title !== "string" ||
      typeof state !== "string" ||
      typeof isDraft !== "boolean" ||
      typeof updatedAt !== "string" ||
      typeof url !== "string"
    ) {
      continue;
    }
    let mergedAt: string | null;
    if (mergedAtRaw === null || mergedAtRaw === undefined) {
      mergedAt = null;
    } else if (typeof mergedAtRaw === "string") {
      mergedAt = mergedAtRaw;
    } else {
      continue;
    }
    out.push({
      number,
      title,
      state,
      isDraft,
      updatedAt,
      url,
      mergedAt,
    });
  }
  return out;
}

function listRecentAuthorPrs(repo: string): GhPr[] {
  const r = spawnSync(
    "gh",
    [
      "pr",
      "list",
      "--author",
      "@me",
      "--state",
      "all",
      "--limit",
      "200",
      "--json",
      "number,title,state,isDraft,updatedAt,mergedAt,url",
    ],
    { encoding: "utf8", cwd: repo, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (r.status !== 0) {
    return [];
  }
  return parsePrListJson(r.stdout ?? "");
}

function prStatusLabel(pr: GhPr): string {
  if (pr.state === "MERGED") {
    return "merged";
  }
  if (pr.state === "CLOSED") {
    return "closed";
  }
  if (pr.isDraft) {
    return "draft";
  }
  return "open";
}

function prActiveSince(pr: GhPr, sinceMs: number): boolean {
  const mergedAt = pr.mergedAt ? Date.parse(pr.mergedAt) : 0;
  if (mergedAt >= sinceMs) {
    return true;
  }
  return Date.parse(pr.updatedAt) >= sinceMs;
}

function main(): void {
  if (!existsSync(TARGET_DIR)) {
    console.error(red(`Error: Target directory ${TARGET_DIR} does not exist.`));
    process.exit(1);
  }

  const sinceMs = Date.now() - DAY_MS;
  const gitdirs = findGitDirs(TARGET_DIR);
  const haveGh = ghAvailable();

  console.log(`${blue(`Scanning for commits in the last 24 hours under: ${TARGET_DIR}`)}\n`);

  for (const gitdir of gitdirs) {
    const repo = dirname(gitdir);
    const repoName = repo.split("/").pop() ?? repo;
    const author = gitConfig(repo, "user.name");
    if (author === "") {
      continue;
    }

    const commits = gitLogSince(repo, author);
    if (commits === "") {
      continue;
    }

    const originUrl = getOriginUrl(repo);
    console.log(`${green(`Repository: ${repoName}`)} ${gray(`(${repo})`)}`);
    for (const line of commits.split("\n")) {
      if (line.length > 0) {
        console.log(`  ${line}`);
      }
    }

    if (haveGh && isGithubOrigin(originUrl)) {
      const prs = listRecentAuthorPrs(repo).filter((p) => prActiveSince(p, sinceMs));
      if (prs.length > 0) {
        console.log("  Pull requests:");
        for (const pr of prs) {
          const st = prStatusLabel(pr);
          console.log(`    #${pr.number} ${pr.title} (${st})`);
        }
      }
    }

    console.log("");
  }
}

main();
