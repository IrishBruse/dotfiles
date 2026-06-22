import process from "node:process";

import { loadEntries, type MemoryEntry } from "./entries.ts";
import { formatEntryListBlock } from "./entryMarkdown.ts";
import { globalStore, type MemoryStore } from "./paths.ts";
import { localStore, resolveScopeKey, scopeLabel } from "./scope.ts";

async function formatSection(
  title: string,
  store: MemoryStore,
  entries: MemoryEntry[],
  omitEmpty: boolean
): Promise<string | null> {
  if (entries.length === 0) {
    return omitEmpty ? null : `## ${title}\n\n_(none)_`;
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
  /** Agent sessions omit empty scopes and print nothing when all are empty. */
  omitEmpty?: boolean;
}): Promise<string> {
  const { cwd, globalOnly, omitEmpty = false } = options;
  const global = globalStore();

  if (globalOnly) {
    const entries = await loadEntries(global);
    const section = await formatSection("Global", global, entries, omitEmpty);
    if (!section) {
      return "";
    }
    return `# Memories\n\n${section}`;
  }

  const local = localStore(cwd);
  const [localEntries, globalEntries] = await Promise.all([
    loadEntries(local),
    loadEntries(global),
  ]);

  const sections = (
    await Promise.all([
      formatSection("Global", global, globalEntries, omitEmpty),
      formatSection(localSectionTitle(cwd), local, localEntries, omitEmpty),
    ])
  ).filter((section): section is string => section !== null);

  if (sections.length === 0) {
    return "";
  }

  return `# Memories\n\n${sections.join("\n\n")}`;
}

/**
 * Run bare `memory` for agents and non-TTY sessions.
 */
export async function runList(options: {
  cwd: string;
  globalOnly?: boolean;
  omitEmpty?: boolean;
}): Promise<void> {
  const markdown = await formatListMarkdown(options);
  if (markdown) {
    process.stdout.write(`${markdown}\n`);
  }
}
