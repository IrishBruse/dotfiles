import { mkdir, unlink, writeFile } from "node:fs/promises";

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

/**
 * Delete reference markdown for an entry id when present.
 */
export async function deleteReference(
  store: MemoryStore,
  id: string
): Promise<void> {
  try {
    await unlink(referencePath(store, id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}
