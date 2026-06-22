import { findEntry, removeEntry } from "./entries.ts";
import { printOk } from "./output.ts";
import { deleteReference } from "./reference.ts";
import { localStore } from "./scope.ts";
import { parseSlug } from "./slug.ts";

/**
 * Run `memory rm <id>`.
 */
export async function runRm(
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

  const { removed } = await removeEntry(found.store, id);
  if (!removed) {
    throw new Error(`No entry with id "${id}".`);
  }

  await deleteReference(found.store, id);
  printOk(`Removed ${id}.`);
}
