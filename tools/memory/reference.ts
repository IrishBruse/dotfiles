import { writeFile, mkdir } from "node:fs/promises";

import { referencePath, type MemoryStore } from "./paths.ts";

/**
 * Write reference markdown for an entry id.
 */
export async function writeReference(
  store: MemoryStore,
  id: string,
  body: string
): Promise<string> {
  const filePath = referencePath(store, id);
  await mkdir(store.referencesDir, { recursive: true });
  await writeFile(filePath, `${body.trim()}\n`, "utf8");
  return filePath;
}
