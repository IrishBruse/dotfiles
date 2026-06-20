import { writeFile, mkdir } from "node:fs/promises";

import { REFERENCES_DIR, referencePath } from "./paths.ts";

/**
 * Write reference markdown for an entry id.
 */
export async function writeReference(id: string, body: string): Promise<string> {
  const filePath = referencePath(id);
  await mkdir(REFERENCES_DIR, { recursive: true });
  await writeFile(filePath, `${body.trim()}\n`, "utf8");
  return filePath;
}
