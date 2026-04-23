import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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

export function createReviewWorkspaceDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-"));
}

/** Write prefetched PR files at the root of `dir` using `gh pr`. On failure, removes `dir` and rethrows. */
export function populateReviewWorkspace(dir: string, target: string): void {
  try {
    writeFormattedJsonFile(
      path.join(dir, "view.json"),
      runGh([
        "pr",
        "view",
        target,
        "--json",
        "number,title,author,baseRefName,headRefName,body,state,labels,reviewRequests",
      ]),
    );

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
  } catch (e) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    throw e;
  }
}
