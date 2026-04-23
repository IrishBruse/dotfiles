import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { MERGED_PREVIEW_FILE, buildPreviewMarkdown } from "./agentOutputFiles.ts";
import { clearPrAgentWorkspaceDir } from "./prAgentWorkspace.ts";
import { prCoordsFromViewPayload } from "./githubPrPrefetchExtra.ts";
import {
  writeChecksSummaryTxt,
  writeFilesChangedTxt,
} from "./prefetchIndex.ts";
import {
  writeJiraSkillBoardSnapshot,
  writeJiraSkillContext,
} from "./jiraSkillContext.ts";
import { writePrCommentsMdAsync } from "./prCommentsMd.ts";

export type PopulateReviewWorkspaceOptions = {
  /**
   * Filename (under `dir`) for the GitHub title/body snapshot. Default is **`PR.md`** (review).
   * For **`pr update`**, pass **`CURRENT.md`** so the agent writes the draft only to **`PR.md`**.
   */
  snapshotPrToFile?: string;
};

function runGhAsync(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("gh", args, { stdio: ["ignore", "pipe", "pipe"] });
    const outChunks: string[] = [];
    const errChunks: string[] = [];
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (c: string) => {
      outChunks.push(c);
    });
    child.stderr.on("data", (c: string) => {
      errChunks.push(c);
    });
    child.on("error", (e) => {
      reject(e);
    });
    child.on("close", (code) => {
      const out = outChunks.join("");
      if (code !== 0) {
        const err = errChunks.join("");
        reject(
          new Error(
            `gh ${args.slice(0, 4).join(" ")}… failed: ${(err || out).trim() || `exit ${code}`}`,
          ),
        );
        return;
      }
      resolve(out);
    });
  });
}

/** One line per commit: short SHA, subject, then body (if any) on the same line. */
function writeCommitsTxtFromRaw(dir: string, commitsRaw: string): void {
  const j = JSON.parse(commitsRaw) as {
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

const viewJsonFields =
  "number,title,author,baseRefName,headRefName,baseRefOid,headRefOid,body,state,labels,reviewRequests,url";

/**
 * Write prefetched PR files at the root of `dir` using **`gh`** (REST).
 * Runs the main **`gh pr view` / `gh pr diff` / JSON views** in one parallel batch, then
 * **`comments.md`** (needs owner/repo/number from the first response), then local index + Jira files.
 * On failure, clears `dir` and rethrows.
 */
export async function populateReviewWorkspace(
  dir: string,
  target: string,
  options?: PopulateReviewWorkspaceOptions,
): Promise<void> {
  const snapshotName = options?.snapshotPrToFile ?? MERGED_PREVIEW_FILE;
  try {
    const [viewRaw, filesRaw, diffText, commitsRaw, checksRaw] = await Promise.all([
      runGhAsync(["pr", "view", target, "--json", viewJsonFields]),
      runGhAsync(["pr", "view", target, "--json", "files"]),
      runGhAsync(["pr", "diff", target]),
      runGhAsync(["pr", "view", target, "--json", "commits"]),
      runGhAsync(["pr", "view", target, "--json", "statusCheckRollup"]),
    ]);

    const viewObj = JSON.parse(viewRaw) as {
      number: number;
      url: string;
      title?: string;
      body?: string | null;
    };
    const titleStr = typeof viewObj.title === "string" ? viewObj.title : "";
    const bodyStr =
      typeof viewObj.body === "string"
        ? viewObj.body
        : viewObj.body == null
          ? ""
          : String(viewObj.body);

    fs.writeFileSync(
      path.join(dir, snapshotName),
      buildPreviewMarkdown(titleStr, bodyStr),
      "utf8",
    );

    const coords = prCoordsFromViewPayload(viewObj);
    await writePrCommentsMdAsync(dir, coords);

    fs.writeFileSync(path.join(dir, "diff.patch"), diffText, "utf8");
    writeCommitsTxtFromRaw(dir, commitsRaw);
    writeFilesChangedTxt(dir, filesRaw);
    writeChecksSummaryTxt(dir, checksRaw);

    writeJiraSkillContext(dir, titleStr, bodyStr);
    writeJiraSkillBoardSnapshot(dir);
  } catch (e) {
    try {
      clearPrAgentWorkspaceDir(dir);
    } catch {
      // ignore
    }
    throw e;
  }
}
