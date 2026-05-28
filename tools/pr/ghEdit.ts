import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function editPullRequest(
  repoRoot: string,
  target: string,
  title: string,
  body: string
): void {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr-cli-edit-"));
  const bodyFile = path.join(tmpDir, "body.md");
  try {
    fs.writeFileSync(bodyFile, body, "utf8");
    const r = spawnSync(
      "gh",
      [
        "pr",
        "edit",
        target,
        "--title",
        title,
        "--body-file",
        bodyFile
      ],
      { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "inherit", "pipe"] }
    );
    if (r.status !== 0) {
      const err = (r.stderr ?? "").trim();
      throw new Error(err || "gh pr edit failed");
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
