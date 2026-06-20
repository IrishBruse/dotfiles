import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";

import { parseStowOutput } from "./parse.ts";

/** How one entry under a partial folder's destination path is classified. */
export type DestinationEntryKind =
  | "stowed-symlink"
  | "other-symlink"
  | "file"
  | "directory";

/** One name under the destination directory for a partial folder. */
export interface DestinationEntry {
  name: string;
  kind: DestinationEntryKind;
  detail: string;
}

/** Why a package folder is only partially stowed and whether it can be promoted. */
export interface PartialFolderAnalysis {
  folderPath: string;
  targetDisplay: string;
  promotable: boolean;
  summary: string;
  entries: DestinationEntry[];
  blockerCount: number;
}

function displayTargetPath(targetRoot: string, folderPath: string): string {
  if (targetRoot === homedir()) {
    return `~/${folderPath}`;
  }
  return path.join(targetRoot, folderPath);
}

function partialFolderCandidates(
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
    if (isPartialFolder(folderPath, unchanged, packageRoot, targetRoot)) {
      candidates.push(folderPath);
    }
  }

  return candidates
    .filter(
      (folderPath) =>
        !candidates.some(
          (other) => other !== folderPath && other.startsWith(`${folderPath}/`)
        )
    )
    .sort((a, b) => a.localeCompare(b));
}

function isPartialFolder(
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

  return hasStowedDescendant(unchanged, folderPath);
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

function shortenLinkTarget(linkTarget: string, linkParent: string): string {
  const resolved = path.resolve(linkParent, linkTarget);
  const dotfilesIdx = resolved.indexOf(`${path.sep}dotfiles${path.sep}`);
  if (dotfilesIdx >= 0) {
    return resolved.slice(dotfilesIdx + 1);
  }
  if (linkTarget.includes("dotfiles")) {
    const idx = linkTarget.indexOf("dotfiles");
    return linkTarget.slice(idx);
  }
  if (linkTarget.length > 48) {
    return `${linkTarget.slice(0, 20)}...${linkTarget.slice(-20)}`;
  }
  return linkTarget;
}

function classifyDestinationEntry(
  entry: string,
  targetDir: string,
  packageDir: string
): DestinationEntry {
  const entryPath = path.join(targetDir, entry);
  const stat = fs.lstatSync(entryPath);

  if (stat.isSymbolicLink()) {
    const linkTarget = fs.readlinkSync(entryPath);
    if (symlinkPointsIntoPackage(linkTarget, targetDir, packageDir)) {
      return {
        name: entry,
        kind: "stowed-symlink",
        detail: shortenLinkTarget(linkTarget, targetDir)
      };
    }
    return {
      name: entry,
      kind: "other-symlink",
      detail: shortenLinkTarget(linkTarget, targetDir)
    };
  }

  if (stat.isDirectory()) {
    return { name: entry, kind: "directory", detail: "real directory" };
  }

  return { name: entry, kind: "file", detail: "real file" };
}

function packageFullyStowed(
  folderPath: string,
  unchanged: Set<string>,
  packageDir: string
): boolean {
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

/**
 * Inspect destination state for a partially stowed folder.
 * @param folderPath Stow-relative path (e.g. `.config/fish`).
 * @param unchangedPaths Paths stow skipped as already linked.
 * @param packageRoot Absolute path to `home/` in the repo.
 * @param targetRoot Absolute stow target (usually `~`).
 * @return Classification, destination listing, and promotability.
 */
export function analyzePartialFolder(
  folderPath: string,
  unchangedPaths: string[],
  packageRoot: string,
  targetRoot: string
): PartialFolderAnalysis {
  const unchanged = new Set(unchangedPaths);
  const targetDisplay = displayTargetPath(targetRoot, folderPath);
  const targetDir = path.join(targetRoot, folderPath);
  const packageDir = path.join(packageRoot, folderPath);

  let entries: DestinationEntry[] = [];
  try {
    entries = fs
      .readdirSync(targetDir)
      .sort((a, b) => a.localeCompare(b))
      .map((entry) => classifyDestinationEntry(entry, targetDir, packageDir));
  } catch {
    entries = [];
  }

  const blockers = entries.filter((entry) => entry.kind !== "stowed-symlink");
  const packageComplete = packageFullyStowed(folderPath, unchanged, packageDir);
  const promotable = blockers.length === 0 && packageComplete;

  let summary = `${targetDisplay} is a directory, not a symlink`;
  if (promotable) {
    summary += "; stow linked files inside (ready to promote)";
  } else if (blockers.length > 0) {
    summary += `; stow linked files inside (${blockers.length} destination item${blockers.length === 1 ? "" : "s"} block full folder link)`;
  } else {
    summary += "; package has unstowed paths";
  }

  return {
    folderPath,
    targetDisplay,
    promotable,
    summary,
    entries,
    blockerCount: blockers.length
  };
}

/**
 * Find deepest partially stowed folders and analyze each destination.
 * @param unchangedPaths Paths stow skipped as already linked.
 * @param packageRoot Absolute path to `home/` in the repo.
 * @param targetRoot Absolute stow target (usually `~`).
 * @return Sorted analyses for interactive preview and promotion.
 */
export function findPartialFolders(
  unchangedPaths: string[],
  packageRoot: string,
  targetRoot: string
): PartialFolderAnalysis[] {
  return partialFolderCandidates(unchangedPaths, packageRoot, targetRoot).map(
    (folderPath) =>
      analyzePartialFolder(folderPath, unchangedPaths, packageRoot, targetRoot)
  );
}

/** Folders that can be promoted to a full directory symlink. */
export function findPromotableFolders(
  unchangedPaths: string[],
  packageRoot: string,
  targetRoot: string
): string[] {
  return findPartialFolders(unchangedPaths, packageRoot, targetRoot)
    .filter((folder) => folder.promotable)
    .map((folder) => folder.folderPath);
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
