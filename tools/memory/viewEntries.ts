import process from "node:process";

import { findEntry } from "./entries.ts";
import { formatEntryMarkdown } from "./entryMarkdown.ts";
import { localStore } from "./scope.ts";
import { parseSlug } from "./slug.ts";

/**
 * Run `memory view <id>` (raw markdown for one entry).
 */
export async function runView(
  args: string[],
  options: { global: boolean }
): Promise<void> {
  if (args.length !== 1) {
    throw new Error("Id is required.");
  }

  const id = parseSlug(args[0]!);
  const local = localStore(process.cwd());
  const found = await findEntry(id, local, { globalOnly: options.global });
  if (!found) {
    throw new Error(`No entry with id "${id}".`);
  }

  process.stdout.write(await formatEntryMarkdown(found.store, found.entry));
}
