import fs from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

import { parseStowOutput } from "./parse.ts";

/** Folder stowed file-by-file; target dir is real, not a symlink to the package. */
export function findPromotableFolders(
  unchangedPaths: string[],
  packageRoot: string,
  targetRoot: string
): string[] {
  const unchanged = new Set(unchangedPaths);
  const parents = new Set<string>();

  for (const stowPath of unchanged) {
    const parts = stowPath.split("/");
    for (let i = 1; i < parts.length; i++) {
      parents.add(parts.slice(0, i).join("/"));
    }
  }

  const candidates: string[] = [];
  for (const folderPath of parents) {
    if (unchanged.has(folderPath)) {
      continue;
    }
    if (isPromotableFolder(folderPath, unchanged, packageRoot, targetRoot)) {
      candidates.push(folderPath);
    }
  }

  return candidates.filter(
    (folderPath) =>
      !candidates.some(
        (other) => other !== folderPath && other.startsWith(`${folderPath}/`)
      )
  );
}

function isPromotableFolder(
  folderPath: string,
  unchanged: Set<string>,
  packageRoot: string,
  targetRoot: string
): boolean {
  const packageDir = path.join(packageRoot, folderPath);
  if (!fs.existsSync(packageDir) || !fs.statSync(packageDir).isDirectory()) {
    return false;
  }

  const targetDir = path.join(targetRoot, folderPath);
  if (!fs.existsSync(targetDir)) {
    return false;
  }
  if (fs.lstatSync(targetDir).isSymbolicLink()) {
    return false;
  }

  let targetEntries: string[];
  try {
    targetEntries = fs.readdirSync(targetDir);
  } catch {
    return false;
  }

  for (const entry of targetEntries) {
    const entryPath = path.join(targetDir, entry);
    if (!fs.lstatSync(entryPath).isSymbolicLink()) {
      return false;
    }
    const linkTarget = fs.readlinkSync(entryPath);
    if (!symlinkPointsIntoPackage(linkTarget, path.dirname(entryPath), packageDir)) {
      return false;
    }
  }

  let packageEntries: string[];
  try {
    packageEntries = fs.readdirSync(packageDir);
  } catch {
    return false;
  }

  for (const entry of packageEntries) {
    const relPath = `${folderPath}/${entry}`;
    if (unchanged.has(relPath)) {
      continue;
    }
    if (!hasStowedDescendant(unchanged, relPath)) {
      return false;
    }
  }

  return packageEntries.length > 0;
}

function hasStowedDescendant(unchanged: Set<string>, prefix: string): boolean {
  const needle = `${prefix}/`;
  for (const stowPath of unchanged) {
    if (stowPath.startsWith(needle)) {
      return true;
    }
  }
  return false;
}

function symlinkPointsIntoPackage(
  linkTarget: string,
  linkParent: string,
  packageDir: string
): boolean {
  const resolved = path.resolve(linkParent, linkTarget);
  const rel = path.relative(packageDir, resolved);
  return rel !== ".." && !rel.startsWith(`..${path.sep}`);
}

export interface PromoteResult {
  ok: boolean;
  folderPath: string;
  linked: string[];
  error?: string;
}

/**
 * Unlink per-file stow symlinks under a partial folder, remove the real target
 * directory, then stow so the folder itself becomes a symlink.
 */
export function promotePartialFolder(
  folderPath: string,
  repoRoot: string,
  packageName: string,
  targetRoot: string
): PromoteResult {
  const targetDir = path.join(targetRoot, folderPath);
  const packageDir = path.join(repoRoot, packageName, folderPath);

  if (!fs.existsSync(targetDir) || fs.lstatSync(targetDir).isSymbolicLink()) {
    return { ok: false, folderPath, linked: [], error: "target is not a plain directory" };
  }

  let entries: string[];
  try {
    entries = fs.readdirSync(targetDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, folderPath, linked: [], error: message };
  }

  for (const entry of entries) {
    const entryPath = path.join(targetDir, entry);
    if (!fs.lstatSync(entryPath).isSymbolicLink()) {
      return {
        ok: false,
        folderPath,
        linked: [],
        error: `${entry} is not a symlink`
      };
    }
    const linkTarget = fs.readlinkSync(entryPath);
    if (!symlinkPointsIntoPackage(linkTarget, targetDir, packageDir)) {
      return {
        ok: false,
        folderPath,
        linked: [],
        error: `${entry} does not point into the dotfiles package`
      };
    }
    fs.unlinkSync(entryPath);
  }

  try {
    fs.rmdirSync(targetDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, folderPath, linked: [], error: message };
  }

  const result = spawnSync(
    "stow",
    [
      "-v2",
      "-d",
      repoRoot,
      "-t",
      targetRoot,
      "--dotfiles",
      packageName,
      "-S"
    ],
    { encoding: "utf8" }
  );

  const lines = (result.stderr ?? "").split("\n").filter((line) => line.length > 0);
  const summary = parseStowOutput(lines);
  const linked = summary.linked.filter(
    (linkedPath) => linkedPath === folderPath || linkedPath.startsWith(`${folderPath}/`)
  );

  if ((result.status ?? 1) !== 0) {
    const detail = summary.conflicts[0] ?? summary.warnings[0] ?? "stow failed";
    return { ok: false, folderPath, linked, error: detail };
  }

  if (!linked.includes(folderPath)) {
    return {
      ok: false,
      folderPath,
      linked,
      error: `expected ${folderPath} to be linked as a directory`
    };
  }

  return { ok: true, folderPath, linked };
}
