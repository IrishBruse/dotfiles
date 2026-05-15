import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function repoDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

export function mergeCursorCliPermissions(repo: string): void {
  const cursorDir = join(repo, "home/.cursor");
  mkdirSync(cursorDir, { recursive: true });
  const permFile = join(cursorDir, "permissions.json");
  const jqMerge = join(repo, "lib/merge-cursor-permissions.jq");
  const cliConfig = join(homedir(), ".cursor/cli-config.json");
  if (!existsSync(cliConfig)) {
    return;
  }
  let repoPerm = "{}";
  if (existsSync(permFile)) {
    repoPerm = readFileSync(permFile, "utf8").trim() || "{}";
  }
  const cliPerm = execFileSync("jq", ["-c", ".permissions // {}", cliConfig], {
    encoding: "utf8",
  }).trimEnd();
  const merged = execFileSync(
    "jq",
    ["-n", "--argjson", "repo", repoPerm, "--argjson", "cli", cliPerm, "-f", jqMerge],
    { encoding: "utf8" },
  );
  writeFileSync(permFile, merged.endsWith("\n") ? merged : `${merged}\n`, "utf8");
}
