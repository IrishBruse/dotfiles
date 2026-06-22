import os from "node:os";
import path from "node:path";

/** On-disk layout for one memory scope. */
export interface MemoryStore {
  entriesPath: string;
  referencesDir: string;
}

/**
 * Root for all memory stores: `~/.agents/memory/`.
 */
export function memoryBaseDir(): string {
  return path.join(os.homedir(), ".agents", "memory");
}

/**
 * Global memory at `~/.agents/memory/global.json`.
 */
export function globalStore(): MemoryStore {
  const base = memoryBaseDir();
  return {
    entriesPath: path.join(base, "global.json"),
    referencesDir: path.join(base, "references", "global"),
  };
}

/**
 * Repo memory at `~/.agents/memory/repos/<name>.json`.
 */
export function repoStore(name: string): MemoryStore {
  const base = memoryBaseDir();
  return {
    entriesPath: path.join(base, "repos", `${name}.json`),
    referencesDir: path.join(base, "references", "repos", name),
  };
}

/**
 * Misc memory at `~/.agents/memory/misc/<path>.json`.
 */
export function miscStore(name: string): MemoryStore {
  const base = memoryBaseDir();
  return {
    entriesPath: path.join(base, "misc", `${name}.json`),
    referencesDir: path.join(base, "references", "misc", name),
  };
}

/** Flat global entries path before scopes used subfolders. */
export function legacyFlatGlobalEntriesPath(): string {
  return path.join(memoryBaseDir(), "entries.json");
}

/** Flat global references dir before scopes used subfolders. */
export function legacyFlatGlobalReferencesDir(): string {
  return path.join(memoryBaseDir(), "references");
}

/** Legacy global entries path before data lived outside the skill. */
export function legacyGlobalEntriesPath(): string {
  return path.join(os.homedir(), ".agents", "skills", "memory", "entries.json");
}

/**
 * Absolute path to `references/<slug>.md` in a store.
 */
export function referencePath(store: MemoryStore, slug: string): string {
  return path.join(store.referencesDir, `${slug}.md`);
}
