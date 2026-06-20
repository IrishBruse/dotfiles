import { unlink } from "node:fs/promises";

import { assertHumanShell } from "./agentGuard.ts";
import { loadEntries, removeEntry } from "./entries.ts";
import { printHint, printOk } from "./output.ts";
import { referencePath } from "./paths.ts";
import {
  assertInteractiveTerminal,
  confirmRemove,
  pickEntry,
} from "./rmInteractive.ts";
import { writeSkill } from "./renderSkill.ts";

async function performRemove(id: string): Promise<void> {
  const { entries, removed } = await removeEntry(id);

  if (!removed) {
    throw new Error(`No entry with id "${id}".`);
  }

  try {
    await unlink(referencePath(id));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  await writeSkill(entries);
  printOk(`Removed ${id}.`);
}

/**
 * Run `memory rm` (human-only; interactive picker).
 */
export async function runRm(args: string[]): Promise<void> {
  assertHumanShell("rm");
  assertInteractiveTerminal("rm");

  if (args.length > 0) {
    throw new Error("memory rm takes no arguments. Run `memory rm` and pick an entry.");
  }

  const entries = await loadEntries();
  if (entries.length === 0) {
    throw new Error("No entries to remove.");
  }

  const entry = await pickEntry(entries);
  if (!entry) {
    printHint("Cancelled.");
    return;
  }

  const confirmed = await confirmRemove(entry);
  if (!confirmed) {
    printHint("Cancelled.");
    return;
  }

  await performRemove(entry.id);
}
