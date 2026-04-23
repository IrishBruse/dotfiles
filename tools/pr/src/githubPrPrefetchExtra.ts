import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const GH_BUFFER = 100 * 1024 * 1024;

export type PrRepoCoords = {
  host: string;
  owner: string;
  repo: string;
  number: number;
};

/** Owner/repo/number for the repo that hosts the PR (from canonical PR URL). */
export function prCoordsFromViewPayload(j: {
  number: number;
  url: string;
}): PrRepoCoords {
  let u: URL;
  try {
    u = new URL(j.url);
  } catch {
    throw new Error(`pr-cli: invalid PR url from gh: ${j.url}`);
  }
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 4 || parts[2] !== "pull") {
    throw new Error(`pr-cli: could not parse owner/repo from PR url: ${j.url}`);
  }
  return {
    host: u.origin,
    owner: parts[0]!,
    repo: parts[1]!,
    number: j.number,
  };
}

function graphqlQuery(): string {
  return `query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){pullRequest(number:$number){reviewThreads(first:100){nodes{isResolved isOutdated comments(first:50){nodes{body path line originalLine diffHunk author{login} createdAt url}}}}timelineItems(last:50 itemTypes:[HEAD_REF_FORCE_PUSHED_EVENT,BASE_REF_FORCE_PUSHED_EVENT]){nodes{__typename ...on HeadRefForcePushedEvent{createdAt actor{login}beforeCommit{oid}afterCommit{oid}}}}}}}}`;
}

/**
 * Review threads (line-level, resolution) + force-push timeline. Writes pretty JSON or `{ "error" }`.
 */
export function writeReviewThreadsAndForcePush(
  dir: string,
  coords: PrRepoCoords,
): void {
  const query = graphqlQuery();
  const r = spawnSync(
    "gh",
    [
      "api",
      "graphql",
      "-f",
      `query=${query}`,
      "-f",
      `owner=${coords.owner}`,
      "-f",
      `name=${coords.repo}`,
      "-F",
      `number=${coords.number}`,
    ],
    {
      encoding: "utf8",
      maxBuffer: GH_BUFFER,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const outPath = path.join(dir, "review-threads.json");
  if (r.status !== 0) {
    const msg = (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status}`;
    fs.writeFileSync(
      outPath,
      JSON.stringify({ error: `graphql failed: ${msg}` }, null, 2) + "\n",
      "utf8",
    );
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    fs.writeFileSync(
      outPath,
      JSON.stringify({ error: "graphql returned non-JSON" }, null, 2) + "\n",
      "utf8",
    );
    return;
  }
  const data = parsed as {
    data?: {
      repository?: {
        pullRequest?: {
          reviewThreads?: unknown;
          timelineItems?: unknown;
        };
      };
    };
    errors?: unknown;
  };
  const pr = data.data?.repository?.pullRequest;
  const payload = {
    graphqlErrors: data.errors ?? null,
    reviewThreads: pr?.reviewThreads ?? { nodes: [] },
    forcePushTimeline: pr?.timelineItems ?? { nodes: [] },
  };
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
}

export function compareRangeUrl(
  coords: PrRepoCoords,
  baseOid: string,
  headOid: string,
): string {
  return `${coords.host}/${coords.owner}/${coords.repo}/compare/${baseOid}...${headOid}`;
}
