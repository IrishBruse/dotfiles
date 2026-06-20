import { loadEntries } from "./entries.ts";
import { printHint } from "./output.ts";
import { SKILL_PATH } from "./paths.ts";

/**
 * Run `memory list` (human-only; agents should read the skill).
 */
export async function runList(): Promise<void> {
  const entries = await loadEntries();

  if (entries.length === 0) {
    console.log("Things learned recently (none)");
  } else {
    console.log(`Things learned recently (${entries.length})\n`);
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]!;
      console.log(`${i + 1}. [${entry.ref}] ${entry.text}`);
    }
  }

  console.log(`\nSkill: ${SKILL_PATH}`);
  printHint("Agents should read the memory skill instead of this command.");
}
