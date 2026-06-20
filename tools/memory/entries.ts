import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";

import { ENTRIES_PATH, MEMORY_SKILL_DIR, referencePath } from "./paths.ts";

/** One inline lesson in the memory skill. */
export interface MemoryEntry {
  text: string;
  id: string;
  hasDetails: boolean;
}

async function readEntriesFile(): Promise<
  Array<{ text: string; id: string; hasDetails?: boolean }>
> {
  try {
    const raw = await readFile(ENTRIES_PATH, "utf8");
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
 * Load all memory entries from disk.
 */
export async function loadEntries(): Promise<MemoryEntry[]> {
  const raw = await readEntriesFile();
  let changed = false;
  const entries = raw.map((entry) => {
    if (typeof entry.hasDetails === "boolean") {
      return entry as MemoryEntry;
    }
    changed = true;
    return {
      text: entry.text,
      id: entry.id,
      hasDetails: existsSync(referencePath(entry.id)),
    };
  });
  if (changed) {
    await saveEntries(entries);
  }
  return entries;
}

/**
 * Persist entries to disk.
 */
export async function saveEntries(entries: MemoryEntry[]): Promise<void> {
  await mkdir(MEMORY_SKILL_DIR, { recursive: true });
  await writeFile(ENTRIES_PATH, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

/**
 * Append one entry, skipping when the id already exists.
 *
 * @return updated entries and whether a new row was added
 */
export async function appendEntry(
  entry: MemoryEntry
): Promise<{ entries: MemoryEntry[]; added: boolean }> {
  const entries = await loadEntries();
  if (entries.some((row) => row.id === entry.id)) {
    return { entries, added: false };
  }
  const next = [...entries, entry];
  await saveEntries(next);
  return { entries: next, added: true };
}

/**
 * Mark an entry as having reference detail on disk.
 *
 * @return updated entries (unchanged when the id is missing or already marked)
 */
export async function markHasDetails(id: string): Promise<MemoryEntry[]> {
  const entries = await loadEntries();
  const index = entries.findIndex((row) => row.id === id);
  if (index === -1) {
    return entries;
  }
  const row = entries[index]!;
  if (row.hasDetails) {
    return entries;
  }
  const next = entries.with(index, { ...row, hasDetails: true });
  await saveEntries(next);
  return next;
}

/**
 * Remove one entry by id.
 *
 * @return updated entries and whether a row was removed
 */
export async function removeEntry(
  id: string
): Promise<{ entries: MemoryEntry[]; removed: boolean }> {
  const entries = await loadEntries();
  const index = entries.findIndex((row) => row.id === id);
  if (index === -1) {
    return { entries, removed: false };
  }
  const next = entries.toSpliced(index, 1);
  await saveEntries(next);
  return { entries: next, removed: true };
}
