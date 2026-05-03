#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const tsc = path.join(root, "node_modules", ".bin", "tsc");
const r = spawnSync(tsc, ["--noEmit", "-p", path.join(root, "tsconfig.json")], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});
process.exit(r.status ?? 1);
