import process from "node:process";

import { loadEntries, type MemoryEntry } from "./entries.ts";
import { formatEntryListBlock } from "./entryMarkdown.ts";
import { globalStore, type MemoryStore } from "./paths.ts";
import { localStore, resolveScopeKey, scopeLabel } from "./scope.ts";

async function formatSection(
  title: string,
  store: MemoryStore,
  entries: MemoryEntry[]
): Promise<string> {
  if (entries.length === 0) {
    return `## ${title}\n\n_(none)_`;
  }
  const blocks = await Promise.all(
    entries.map((entry) => formatEntryListBlock(store, entry))
  );
  return `## ${title}\n\n${blocks.join("\n")}`;
}

function localSectionTitle(cwd: string): string {
  return `Local (${scopeLabel(resolveScopeKey(cwd))})`;
}

/**
 * Print scoped memory as markdown (local + global, or one scope).
 */
export async function formatListMarkdown(options: {
  cwd: string;
  globalOnly?: boolean;
}): Promise<string> {
  const { cwd, globalOnly } = options;
  const global = globalStore();

  if (globalOnly) {
    const entries = await loadEntries(global);
    return `# Memories\n\n${await formatSection("Global", global, entries)}`;
  }

  const local = localStore(cwd);
  const [localEntries, globalEntries] = await Promise.all([
    loadEntries(local),
    loadEntries(global),
  ]);

  const sections = await Promise.all([
    formatSection("Global", global, globalEntries),
    formatSection(localSectionTitle(cwd), local, localEntries),
  ]);

  return `# Memories\n\n${sections.join("\n\n")}`;
}

/**
 * Run bare `memory` for agents and non-TTY sessions.
 */
export async function runList(options: {
  cwd: string;
  globalOnly?: boolean;
}): Promise<void> {
  process.stdout.write(`${await formatListMarkdown(options)}\n`);
}
