/**
 * Paths under the dotfiles `jira-tickets` skill and lookup of on-disk ticket markdown.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Skill folder: `<dotfiles>/home/.agents/skills/jira-tickets/` */
export const JIRA_TICKETS_SKILL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "home",
  ".agents",
  "skills",
  "jira-tickets",
);

export const JIRA_REFERENCES_DIR = path.join(
  JIRA_TICKETS_SKILL_DIR,
  "references",
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
