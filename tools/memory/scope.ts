import os from "node:os";
import path from "node:path";

import {
  globalStore,
  memoryBaseDir,
  miscStore,
  repoStore,
  type MemoryStore,
} from "./paths.ts";

/** Local scope key derived from cwd. */
export type ScopeKey =
  | { kind: "repo"; name: string }
  | { kind: "misc"; name: string };

/**
 * Root directory used to derive local scope from cwd.
 * Under `~/git/<repo>/...` uses the repo root; otherwise uses cwd exactly.
 */
export function resolveLocalRoot(cwd: string): string {
  const gitBase = path.join(os.homedir(), "git");
  const rel = path.relative(gitBase, cwd);
  if (!rel.startsWith("..") && !path.isAbsolute(rel)) {
    const repo = rel.split(path.sep)[0]!;
    return path.join(gitBase, repo);
  }
  return cwd;
}

/**
 * Stable scope key for storing local memory under ~/.agents/memory/.
 */
export function resolveScopeKey(cwd: string): ScopeKey {
  const home = os.homedir();
  const gitBase = path.join(home, "git");
  const relGit = path.relative(gitBase, cwd);
  if (!relGit.startsWith("..") && !path.isAbsolute(relGit)) {
    return { kind: "repo", name: relGit.split(path.sep)[0]! };
  }
  const relHome = path.relative(home, cwd);
  const name = relHome === "" ? "home" : relHome.split(path.sep).join("/");
  return { kind: "misc", name };
}

/**
 * Human label for a scope key.
 */
export function scopeLabel(key: ScopeKey): string {
  if (key.kind === "repo") {
    return key.name;
  }
  return key.name === "home" ? "~" : key.name;
}

/**
 * Store path for a scope key under ~/.agents/memory/.
 */
export function storeForScopeKey(key: ScopeKey): MemoryStore {
  if (key.kind === "repo") {
    return repoStore(key.name);
  }
  return miscStore(key.name);
}

/**
 * Local memory store for cwd.
 */
export function localStore(cwd: string): MemoryStore {
  return storeForScopeKey(resolveScopeKey(cwd));
}

/**
 * Resolve the target store for a command.
 */
export function resolveStore(global: boolean, cwd: string): MemoryStore {
  return global ? globalStore() : localStore(cwd);
}
