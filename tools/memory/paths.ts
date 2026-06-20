import path from "node:path";
import { fileURLToPath } from "node:url";

/** Skill folder: `<dotfiles>/home/.agents/skills/memory/` */
export const MEMORY_SKILL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "home",
  ".agents",
  "skills",
  "memory"
);

export const ENTRIES_PATH = path.join(MEMORY_SKILL_DIR, "entries.json");

export const SKILL_PATH = path.join(MEMORY_SKILL_DIR, "SKILL.md");

export const REFERENCES_DIR = path.join(MEMORY_SKILL_DIR, "references");

/**
 * Absolute path to `references/<slug>.md`.
 */
export function referencePath(slug: string): string {
  return path.join(REFERENCES_DIR, `${slug}.md`);
}
