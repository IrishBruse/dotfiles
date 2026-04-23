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

export function createReviewWorkspaceDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-"));
}

/** Write `context/*` under `dir` using `gh pr` for the given PR. On failure, removes `dir` and rethrows. */
export function populateReviewWorkspace(dir: string, target: string): void {
  try {
    const ctx = path.join(dir, "context");
    fs.mkdirSync(ctx, { recursive: true });

    fs.writeFileSync(
      path.join(ctx, "view.json"),
      runGh([
        "pr",
        "view",
        target,
        "--json",
        "number,title,author,baseRefName,headRefName,body,state,labels,reviewRequests",
      ]),
      "utf8",
    );

    fs.writeFileSync(
      path.join(ctx, "files.json"),
      runGh(["pr", "view", target, "--json", "files"]),
      "utf8",
    );

    fs.writeFileSync(
      path.join(ctx, "threads.json"),
      runGh(["pr", "view", target, "--json", "reviews,comments"]),
      "utf8",
    );

    fs.writeFileSync(
      path.join(ctx, "diff.patch"),
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
