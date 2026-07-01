/**
 * Paths under the `~/.agents/skills/jira-board/` skill and lookup of on-disk ticket markdown.
 */
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/** Skill folder: `~/.agents/skills/jira-board/` */
export const JIRA_BOARD_SKILL_DIR = path.resolve(
  homedir(),
  ".agents",
  "skills",
  "jira-board"
);

export const JIRA_REFERENCES_DIR = path.join(
  JIRA_BOARD_SKILL_DIR,
  "references"
);

export const JIRA_MISC_DIR = path.join(JIRA_REFERENCES_DIR, "misc");

const LOOKUP_ORDER = ["me", "team", "unassigned", "misc"] as const;

/** First existing `references/<bucket>/<KEY>.md` in a stable order, or null. */
export function findLocalTicketMarkdown(key: string): string | null {
  for (const sub of LOOKUP_ORDER) {
    const p = path.join(JIRA_REFERENCES_DIR, sub, `${key}.md`);
    if (fs.existsSync(p)) return p;
  }
  return null;
}
