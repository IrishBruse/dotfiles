import { readFile } from "node:fs/promises";

import type { MemoryEntry } from "./entries.ts";
import { referencePath } from "./paths.ts";

/**
 * Raw markdown for an entry (summary plus reference body when present).
 */
export async function formatEntryMarkdown(entry: MemoryEntry): Promise<string> {
  const header = `# ${entry.id}\n\n${entry.text}\n`;
  if (!entry.hasDetails) {
    return `${header}\n_No reference detail yet._\n`;
  }
  const body = await readFile(referencePath(entry.id), "utf8");
  return `${header}\n---\n\n${body}`;
}
