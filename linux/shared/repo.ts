import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function repoDir(importMetaUrl: string): string {
  return dirname(fileURLToPath(importMetaUrl));
}

export function repoRoot(importMetaUrl: string): string {
  const dir = repoDir(importMetaUrl);
  const name = dir.split("/").at(-1);
  return name === "macos" || name === "linux" ? dirname(dir) : dir;
}
