import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { prCoordsFromViewPayload } from "./githubPrPrefetchExtra.ts";
import { writeJiraSkillContext } from "./jiraSkillContext.ts";
import { writePrCommentsTxt } from "./prCommentsTxt.ts";

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

/** One line per commit: short SHA, subject, then body (if any) on the same line. */
function writeCommitsTxt(dir: string, target: string): void {
  const raw = runGh(["pr", "view", target, "--json", "commits"]);
  const j = JSON.parse(raw) as {
    commits?: Array<{
      oid: string;
      messageHeadline?: string;
      messageBody?: string;
    }>;
  };
  const lines: string[] = [];
  for (const c of j.commits ?? []) {
    const short = c.oid.length >= 7 ? c.oid.slice(0, 7) : c.oid;
    const headline = (c.messageHeadline ?? "").trim();
    const body = (c.messageBody ?? "").trim().replace(/\s+/g, " ");
    let desc = headline;
    if (body !== "") {
      desc = headline === "" ? body : `${headline} — ${body}`;
    }
    if (desc === "") {
      desc = c.oid;
    }
    lines.push(`${short} ${desc}`);
  }
  fs.writeFileSync(path.join(dir, "commits.txt"), lines.join("\n") + "\n", "utf8");
}

export function createReviewWorkspaceDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-"));
}

/** Write prefetched PR files at the root of `dir` using `gh` (REST). On failure, removes `dir` and rethrows. */
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

    fs.writeFileSync(
      path.join(dir, "diff.patch"),
      runGh(["pr", "diff", target]),
      "utf8",
    );

    writeCommitsTxt(dir, target);

    writeFormattedJsonFile(
      path.join(dir, "checks.json"),
      runGh(["pr", "view", target, "--json", "statusCheckRollup"]),
    );

    writePrCommentsTxt(dir, coords);

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
