#!/usr/bin/env node
/**
 * Run `tsc --noEmit` for each TypeScript project (same as `npm run validate`).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsc = path.join(root, "node_modules", ".bin", "tsc");

const projects = [
  "tools/pr",
  "tools/atlassian",
  "scripts",
  "vscode",
] as const;

for (const rel of projects) {
  const r = spawnSync(tsc, ["--noEmit", "-p", path.join(root, rel)], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}
