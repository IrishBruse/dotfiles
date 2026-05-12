import { spawn } from "node:child_process";

import { buildPreviewMarkdown, MERGED_PREVIEW_FILE } from "./agentOutputFiles.ts";
import { prCoordsFromViewPayload } from "./githubPrPrefetchExtra.ts";
import {
  checksSummaryTextFromJson,
  filesChangedTextFromJson,
} from "./prefetchIndex.ts";
import {
  collectJiraKeyMarkdownFiles,
  readJiraSkillBoardText,
} from "./jiraSkillContext.ts";
import { fetchPrCommentsMdContentAsync } from "./prCommentsMd.ts";

export type FetchReviewPrefetchOptions = {
  /**
   * Filename for the GitHub title/body snapshot. Default **`PR.md`** (review).
   * For **`pr update`**, use **`CURRENT.md`** so the agent writes only to **`PR.md`**.
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
export function commitsTxtFromRaw(commitsRaw: string): string {
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
      desc = headline === "" ? body : `${headline} - ${body}`;
    }
    if (desc === "") {
      desc = c.oid;
    }
    lines.push(`${short} ${desc}`);
  }
  return lines.join("\n") + "\n";
}

const viewJsonFields =
  "number,title,author,baseRefName,headRefName,headRefOid,body,state,labels,reviewRequests,url";

/**
 * Fetches the same data as the former review workspace **`gh`** batch: PR snapshot, diff, files list,
 * commits digest, checks, comments, Jira snapshots. Values are inlined into the agent prompt (no prefetch dir).
 */
export async function fetchReviewPrefetchFiles(
  target: string,
  options?: FetchReviewPrefetchOptions,
): Promise<Record<string, string>> {
  const snapshotName = options?.snapshotPrToFile ?? MERGED_PREVIEW_FILE;
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

  const out: Record<string, string> = {};
  out[snapshotName] = buildPreviewMarkdown(titleStr, bodyStr);

  const coords = prCoordsFromViewPayload(viewObj);
  out["comments.md"] = await fetchPrCommentsMdContentAsync(coords);

  out["diff.patch"] = diffText;
  out["commits.txt"] = commitsTxtFromRaw(commitsRaw);
  out["files.txt"] = filesChangedTextFromJson(filesRaw);
  out["checks.txt"] = checksSummaryTextFromJson(checksRaw);

  const board = readJiraSkillBoardText();
  if (board !== null) {
    out["jira-tickets-board.md"] = board;
  }
  Object.assign(out, collectJiraKeyMarkdownFiles(titleStr, bodyStr));

  return out;
}
