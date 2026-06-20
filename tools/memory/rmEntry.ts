import { unlink } from "node:fs/promises";

import { assertHumanShell } from "./agentGuard.ts";
import { loadEntries, removeEntry } from "./entries.ts";
import type { MemoryEntry } from "./entries.ts";
import { printHint, printOk } from "./output.ts";
import { referencePath } from "./paths.ts";
import {
  assertInteractiveTerminal,
  confirmRemove,
  pickEntry,
} from "./rmInteractive.ts";
import { writeSkill } from "./renderSkill.ts";
import { parseSlug } from "./slug.ts";

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

function findEntry(entries: MemoryEntry[], id: string): MemoryEntry | undefined {
  return entries.find((row) => row.id === id);
}

/**
 * Run `memory rm [id]` (human-only; interactive picker when id is omitted).
 */
export async function runRm(args: string[]): Promise<void> {
  assertHumanShell("rm");
  assertInteractiveTerminal("rm");

  const entries = await loadEntries();
  if (entries.length === 0) {
    throw new Error("No entries to remove.");
  }

  let entry: MemoryEntry | null | undefined;

  if (args.length === 0) {
    entry = await pickEntry(entries);
    if (!entry) {
      printHint("Cancelled.");
      return;
    }
  } else {
    const id = parseSlug(args[0]!);
    entry = findEntry(entries, id);
    if (!entry) {
      throw new Error(`No entry with id "${id}".`);
    }
  }

  const confirmed = await confirmRemove(entry);
  if (!confirmed) {
    printHint("Cancelled.");
    return;
  }

  await performRemove(entry.id);
}
