import { writeFile, mkdir } from "node:fs/promises";

import type { MemoryEntry } from "./entries.ts";
import { MEMORY_SKILL_DIR, SKILL_PATH } from "./paths.ts";

function formatBullet(entry: MemoryEntry): string {
  const text = entry.text.trim();
  const label = entry.hasDetails
    ? `[${entry.id}](references/${entry.id}.md)`
    : entry.id;
  return `- ${label}: ${text}`;
}

/**
 * Regenerate `SKILL.md` from the current entries.
 */
export async function writeSkill(entries: MemoryEntry[]): Promise<void> {
  const bullets =
    entries.length > 0
      ? entries.map(formatBullet).join("\n")
      : "- (none yet)";

  const body = `---
name: memory
description: Persistent lessons learned across agent sessions. Use when starting similar work, hitting recurring issues, or when the user asks what has been learned recently.
---

# Things learned recently

${bullets}
`;

  await mkdir(MEMORY_SKILL_DIR, { recursive: true });
  await writeFile(SKILL_PATH, body, "utf8");
}
