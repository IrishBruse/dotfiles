import { existsSync } from "node:fs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  globalStore,
  legacyFlatGlobalEntriesPath,
  legacyFlatGlobalReferencesDir,
  legacyGlobalEntriesPath,
  memoryBaseDir,
  referencePath,
  type MemoryStore,
} from "./paths.ts";

/** One inline lesson in memory. */
export interface MemoryEntry {
  text: string;
  id: string;
  hasDetails: boolean;
}

type LegacyLocation = { entriesPath?: string; referencesDir?: string };

function legacyLocations(store: MemoryStore): LegacyLocation[] {
  const base = memoryBaseDir();
  const global = globalStore();
  if (store.entriesPath === global.entriesPath) {
    return [
      { entriesPath: path.join(base, "global", "entries.json"), referencesDir: path.join(base, "global", "references") },
      { entriesPath: legacyFlatGlobalEntriesPath(), referencesDir: legacyFlatGlobalReferencesDir() },
      { entriesPath: legacyGlobalEntriesPath() },
    ];
  }

  const repoRel = path.relative(path.join(base, "repos"), store.entriesPath);
  if (repoRel.endsWith(".json") && !repoRel.includes(path.sep)) {
    const name = repoRel.slice(0, -".json".length);
    return [
      {
        entriesPath: path.join(base, "repos", name, "entries.json"),
        referencesDir: path.join(base, "repos", name, "references"),
      },
    ];
  }

  const miscRel = path.relative(path.join(base, "misc"), store.entriesPath);
  if (!miscRel.startsWith("..") && miscRel.endsWith(".json")) {
    const name = miscRel.slice(0, -".json".length);
    const oldName = name === "home" ? "." : name;
    return [
      {
        entriesPath: path.join(base, "paths", oldName, "entries.json"),
        referencesDir: path.join(base, "paths", oldName, "references"),
      },
    ];
  }

  return [];
}

async function migrateLegacyEntries(store: MemoryStore): Promise<void> {
  if (existsSync(store.entriesPath)) {
    return;
  }

  for (const legacy of legacyLocations(store)) {
    if (legacy.entriesPath && existsSync(legacy.entriesPath)) {
      await mkdir(path.dirname(store.entriesPath), { recursive: true });
      const raw = await readFile(legacy.entriesPath, "utf8");
      await writeFile(store.entriesPath, raw, "utf8");
      if (
        legacy.referencesDir &&
        existsSync(legacy.referencesDir) &&
        !existsSync(store.referencesDir)
      ) {
        await cp(legacy.referencesDir, store.referencesDir, { recursive: true });
      }
      return;
    }
  }
}

async function readEntriesFile(
  store: MemoryStore
): Promise<Array<{ text: string; id: string; hasDetails?: boolean }>> {
  await migrateLegacyEntries(store);
  try {
    const raw = await readFile(store.entriesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is { text: string; id: string; hasDetails?: boolean } =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as MemoryEntry).text === "string" &&
        typeof (item as MemoryEntry).id === "string"
    );
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw err;
  }
}

/**
 * Load all memory entries from a store.
 */
export async function loadEntries(store: MemoryStore): Promise<MemoryEntry[]> {
  const raw = await readEntriesFile(store);
  let changed = false;
  const entries = raw.map((entry) => {
    if (typeof entry.hasDetails === "boolean") {
      return entry as MemoryEntry;
    }
    changed = true;
    return {
      text: entry.text,
      id: entry.id,
      hasDetails: existsSync(referencePath(store, entry.id)),
    };
  });
  if (changed) {
    await saveEntries(store, entries);
  }
  return entries;
}

/**
 * Persist entries to a store.
 */
export async function saveEntries(
  store: MemoryStore,
  entries: MemoryEntry[]
): Promise<void> {
  await mkdir(path.dirname(store.entriesPath), { recursive: true });
  await writeFile(
    store.entriesPath,
    `${JSON.stringify(entries, null, 2)}\n`,
    "utf8"
  );
}

/**
 * Append one entry, skipping when the id already exists.
 *
 * @return updated entries and whether a new row was added
 */
export async function appendEntry(
  store: MemoryStore,
  entry: MemoryEntry
): Promise<{ entries: MemoryEntry[]; added: boolean }> {
  const entries = await loadEntries(store);
  if (entries.some((row) => row.id === entry.id)) {
    return { entries, added: false };
  }
  const next = [...entries, entry];
  await saveEntries(store, next);
  return { entries: next, added: true };
}

/**
 * Remove one entry by id.
 *
 * @return updated entries and whether a row was removed
 */
export async function removeEntry(
  store: MemoryStore,
  id: string
): Promise<{ entries: MemoryEntry[]; removed: boolean }> {
  const entries = await loadEntries(store);
  const index = entries.findIndex((row) => row.id === id);
  if (index === -1) {
    return { entries, removed: false };
  }
  const next = entries.toSpliced(index, 1);
  await saveEntries(store, next);
  return { entries: next, removed: true };
}

/**
 * Find an entry by id in local store, then global.
 */
export async function findEntry(
  id: string,
  local: MemoryStore,
  options?: { globalOnly?: boolean }
): Promise<{ entry: MemoryEntry; store: MemoryStore } | undefined> {
  const global = globalStore();
  const stores = options?.globalOnly ? [global] : [local, global];
  for (const store of stores) {
    const entry = (await loadEntries(store)).find((row) => row.id === id);
    if (entry) {
      return { entry, store };
    }
  }
  return undefined;
}
