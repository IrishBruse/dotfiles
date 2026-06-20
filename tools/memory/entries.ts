import { readFile, writeFile, mkdir } from "node:fs/promises";

import { ENTRIES_PATH, MEMORY_SKILL_DIR } from "./paths.ts";

/** One inline lesson in the memory skill. */
export interface MemoryEntry {
  text: string;
  ref: string;
}

const MAX_ENTRIES = 20;

async function readEntriesFile(): Promise<MemoryEntry[]> {
  try {
    const raw = await readFile(ENTRIES_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is MemoryEntry =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as MemoryEntry).text === "string" &&
        typeof (item as MemoryEntry).ref === "string"
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
  return readEntriesFile();
}

/**
 * Persist entries and enforce the inline cap.
 */
export async function saveEntries(entries: MemoryEntry[]): Promise<void> {
  await mkdir(MEMORY_SKILL_DIR, { recursive: true });
  const trimmed =
    entries.length > MAX_ENTRIES
      ? entries.slice(entries.length - MAX_ENTRIES)
      : entries;
  await writeFile(ENTRIES_PATH, `${JSON.stringify(trimmed, null, 2)}\n`, "utf8");
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
  if (entries.some((row) => row.ref === entry.ref)) {
    return { entries, added: false };
  }
  const next = [...entries, entry];
  await saveEntries(next);
  return { entries: next, added: true };
}
