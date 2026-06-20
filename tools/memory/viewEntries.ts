import { loadEntries } from "./entries.ts";
import { isCursorAgent, printAgentViewHint } from "./agentGuard.ts";
import { formatEntryMarkdown } from "./entryMarkdown.ts";
import { parseSlug } from "./slug.ts";

/**
 * Run `memory view <id>` (raw markdown for one entry).
 */
export async function runView(args: string[]): Promise<void> {
  if (isCursorAgent()) {
    printAgentViewHint();
    return;
  }

  if (args.length !== 1) {
    throw new Error("Id is required.");
  }

  const id = parseSlug(args[0]!);
  const entry = (await loadEntries()).find((row) => row.id === id);
  if (!entry) {
    throw new Error(`No entry with id "${id}".`);
  }

  process.stdout.write(await formatEntryMarkdown(entry));
}
