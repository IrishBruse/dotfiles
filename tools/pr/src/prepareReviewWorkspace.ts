import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  compareRangeUrl,
  prCoordsFromViewPayload,
  writeReviewThreadsAndForcePush,
} from "./githubPrPrefetchExtra.ts";
import { writeJiraSkillContext } from "./jiraSkillContext.ts";

const GH_BUFFER = 100 * 1024 * 1024;

function runGh(args: string[]): string {
  const r = spawnSync("gh", args, {
    encoding: "utf8",
    maxBuffer: GH_BUFFER,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const msg = (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status}`;
    throw new Error(`gh ${args.slice(0, 4).join(" ")}… failed: ${msg}`);
  }
  return r.stdout ?? "";
}

function writeFormattedJsonFile(filePath: string, ghJsonStdout: string): void {
  const parsed: unknown = JSON.parse(ghJsonStdout);
  fs.writeFileSync(
    filePath,
    JSON.stringify(parsed, null, 2) + "\n",
    "utf8",
  );
}

function writeFormattedJsonObject(filePath: string, obj: unknown): void {
  fs.writeFileSync(
    filePath,
    JSON.stringify(obj, null, 2) + "\n",
    "utf8",
  );
}

export function createReviewWorkspaceDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-"));
}

/** Write prefetched PR files at the root of `dir` using `gh` + one GraphQL call. On failure, removes `dir` and rethrows. */
export function populateReviewWorkspace(dir: string, target: string): void {
  try {
    const viewRaw = runGh([
      "pr",
      "view",
      target,
      "--json",
      "number,title,author,baseRefName,headRefName,baseRefOid,headRefOid,body,state,labels,reviewRequests,url",
    ]);
    const viewObj = JSON.parse(viewRaw) as {
      number: number;
      url: string;
      body?: string;
    };
    writeFormattedJsonObject(path.join(dir, "view.json"), viewObj);

    const coords = prCoordsFromViewPayload(viewObj);

    writeFormattedJsonFile(
      path.join(dir, "files.json"),
      runGh(["pr", "view", target, "--json", "files"]),
    );

    writeFormattedJsonFile(
      path.join(dir, "threads.json"),
      runGh(["pr", "view", target, "--json", "reviews,comments"]),
    );

    fs.writeFileSync(
      path.join(dir, "diff.patch"),
      runGh(["pr", "diff", target]),
      "utf8",
    );

    const commitsRaw = runGh([
      "pr",
      "view",
      target,
      "--json",
      "commits,baseRefOid,headRefOid,baseRefName,headRefName,url,headRepository",
    ]);
    const commitsObj = JSON.parse(commitsRaw) as {
      baseRefOid?: string;
      headRefOid?: string;
    };
    const enriched = {
      ...commitsObj,
      compareRangeUrl:
        commitsObj.baseRefOid !== undefined &&
        commitsObj.headRefOid !== undefined
          ? compareRangeUrl(coords, commitsObj.baseRefOid, commitsObj.headRefOid)
          : null,
    };
    writeFormattedJsonObject(path.join(dir, "commits.json"), enriched);

    writeFormattedJsonFile(
      path.join(dir, "checks.json"),
      runGh(["pr", "view", target, "--json", "statusCheckRollup"]),
    );

    writeReviewThreadsAndForcePush(dir, coords);

    writeJiraSkillContext(dir, typeof viewObj.body === "string" ? viewObj.body : "");
  } catch (e) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    throw e;
  }
}
