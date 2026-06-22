import { readFile } from "node:fs/promises";

import type { MemoryEntry } from "./entries.ts";
import { referencePath, type MemoryStore } from "./paths.ts";

/**
 * One-line list item for memory dumps.
 */
export function formatEntryListItem(entry: MemoryEntry): string {
  return `- \`${entry.id}\`: ${entry.text}`;
}

/**
 * List item plus reference body when present.
 */
export async function formatEntryListBlock(
  store: MemoryStore,
  entry: MemoryEntry
): Promise<string> {
  const line = formatEntryListItem(entry);
  if (!entry.hasDetails) {
    return line;
  }
  const body = (await readFile(referencePath(store, entry.id), "utf8")).trim();
  return `${line}\n\n${body}`;
}

/**
 * Raw markdown for an entry (summary plus reference body when present).
 */
export async function formatEntryMarkdown(
  store: MemoryStore,
  entry: MemoryEntry
): Promise<string> {
  const header = `## \`${entry.id}\`\n\n${entry.text}`;
  if (!entry.hasDetails) {
    return header;
  }
  const body = (await readFile(referencePath(store, entry.id), "utf8")).trim();
  return `${header}\n\n---\n\n${body}`;
}
