import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findPartialFolders,
  importPartialFolderLocals,
  type ImportLocalsResult
} from "./partial.ts";
import { queryDotfilesStow } from "./stow.ts";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const STOW_PACKAGE = "home";
const PACKAGE_ROOT = path.join(REPO_ROOT, STOW_PACKAGE);
const STOW_TARGET = homedir();

/** Roots used when importing paths into the package. */
export interface ImportRoots {
  repoRoot: string;
  packageName: string;
  targetRoot: string;
}

/** How a path was brought into the package. */
export type ImportMode = "move" | "partial";

/** Result of importing one stow-relative path from ~ into home/. */
export interface ImportPathResult {
  ok: boolean;
  relPath: string;
  imported: string[];
  linked: string[];
  error?: string;
  mode: ImportMode;
}

/**
 * Normalize a user path to a stow-relative path under ~.
 *
 * @param raw Path argument (e.g. `.zshrc`, `~/.config/fish`, absolute under ~).
 * @return Stow-relative path or null when invalid.
 */
export function normalizeStowPath(raw: string): string | null {
  const home = homedir();
  let rel = raw.trim();

  if (rel === "~" || rel === "") {
    return null;
  }

  if (rel.startsWith("~/")) {
    rel = rel.slice(2);
  } else if (path.isAbsolute(rel)) {
    const fromHome = path.relative(home, rel);
    if (fromHome.startsWith("..") || path.isAbsolute(fromHome)) {
      return null;
    }
    rel = fromHome;
  }

  if (rel.startsWith("./")) {
    rel = rel.slice(2);
  }

  if (rel === "" || rel === ".") {
    return null;
  }

  return rel;
}

function packageRoot(roots: ImportRoots): string {
  return path.join(roots.repoRoot, roots.packageName);
}

function isManagedSymlink(entryPath: string, packageRootPath: string): boolean {
  try {
    if (!fs.lstatSync(entryPath).isSymbolicLink()) {
      return false;
    }
    const linkTarget = fs.readlinkSync(entryPath);
    const resolved = path.resolve(path.dirname(entryPath), linkTarget);
    const rel = path.relative(packageRootPath, resolved);
    return rel !== ".." && !rel.startsWith(`..${path.sep}`);
  } catch {
    return false;
  }
}

function isPartialFolderImport(
  relPath: string,
  unchangedPaths: string[],
  roots: ImportRoots
): boolean {
  const packageRootPath = packageRoot(roots);
  if (!fs.existsSync(path.join(packageRootPath, relPath))) {
    return false;
  }
  return findPartialFolders(unchangedPaths, packageRootPath, roots.targetRoot).some(
    (folder) => folder.folderPath === relPath
  );
}

function toImportPathResult(
  relPath: string,
  result: ImportLocalsResult,
  mode: ImportMode
): ImportPathResult {
  return {
    ok: result.ok,
    relPath,
    imported: result.imported,
    linked: result.linked,
    error: result.error,
    mode
  };
}

/**
 * Move one path from the stow target into the package, or import partial-folder locals.
 *
 * @param relPath Stow-relative path (e.g. `.zshrc`, `.config/fish`).
 * @param roots Repo, package, and target directories.
 * @param unchangedPaths Stow unchanged list (empty when nothing is stowed yet).
 * @return Import outcome for display or further stow steps.
 */
export function importDotfilePathAt(
  relPath: string,
  roots: ImportRoots,
  unchangedPaths: string[]
): ImportPathResult {
  const packageRootPath = packageRoot(roots);
  const source = path.join(roots.targetRoot, relPath);
  const dest = path.join(packageRootPath, relPath);

  if (isPartialFolderImport(relPath, unchangedPaths, roots)) {
    return toImportPathResult(
      relPath,
      importPartialFolderLocals(
        relPath,
        unchangedPaths,
        roots.repoRoot,
        roots.packageName,
        roots.targetRoot
      ),
      "partial"
    );
  }

  if (!fs.existsSync(source)) {
    return {
      ok: false,
      relPath,
      imported: [],
      linked: [],
      error: `no such file: ~/${relPath}`,
      mode: "move"
    };
  }

  if (isManagedSymlink(source, packageRootPath)) {
    return {
      ok: false,
      relPath,
      imported: [],
      linked: [],
      error: `already stowed: ~/${relPath}`,
      mode: "move"
    };
  }

  if (fs.existsSync(dest)) {
    return {
      ok: false,
      relPath,
      imported: [],
      linked: [],
      error: `already in package: home/${relPath}`,
      mode: "move"
    };
  }

  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(source, dest);
    return { ok: true, relPath, imported: [relPath], linked: [], mode: "move" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      relPath,
      imported: [],
      linked: [],
      error: message,
      mode: "move"
    };
  }
}

/**
 * Move one path from ~ into home/, or import local blockers for a partial folder.
 *
 * @param relPath Stow-relative path (e.g. `.zshrc`, `.config/fish`).
 * @param unchangedPaths Optional stow unchanged list; queried when omitted.
 * @return Import outcome for display or further stow steps.
 */
export function importDotfilePath(
  relPath: string,
  unchangedPaths?: string[]
): ImportPathResult {
  const unchanged = unchangedPaths ?? queryDotfilesStow(true).summary.unchanged;
  return importDotfilePathAt(
    relPath,
    { repoRoot: REPO_ROOT, packageName: STOW_PACKAGE, targetRoot: STOW_TARGET },
    unchanged
  );
}
