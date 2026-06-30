import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type PrSkillName = "pr-create" | "pr-update" | "pr-fix";

const INLINED_SKILL_NOTE =
  "Do not read any PR-related skills (pr, pr-create, pr-update, pr-fix) or their reference files. Their instructions are inlined below.";

const BODY_FORMAT_REF = path.join("pr", "body-format.md");

const COMPOSE_SKILLS: PrSkillName[] = ["pr-create", "pr-update"];

function stripFrontMatter(text: string): string {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") {
    return text;
  }
  const end = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---"
  );
  if (end < 0) {
    return text;
  }
  return lines.slice(end + 1).join("\n");
}

function skillsBaseDir(): string {
  const repoDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "home",
    ".agents",
    "skills"
  );
  if (fs.existsSync(repoDir)) {
    return repoDir;
  }
  return path.join(os.homedir(), ".agents", "skills");
}

function readSkillFile(relPath: string): string {
  const full = path.join(skillsBaseDir(), relPath);
  const raw = fs.readFileSync(full, "utf-8");
  return stripFrontMatter(raw).trim();
}

/** Inlined skill instructions to place at the top of a `pr` agent prompt. */
export function inlinedSkillLines(skillName: PrSkillName): string[] {
  const lines = [
    INLINED_SKILL_NOTE,
    "",
    readSkillFile(path.join(skillName, "SKILL.md"))
  ];
  if (COMPOSE_SKILLS.includes(skillName)) {
    lines.push("", readSkillFile(BODY_FORMAT_REF));
  }
  lines.push("", "---", "");
  return lines;
}
