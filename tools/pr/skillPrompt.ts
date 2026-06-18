import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type PrSkillName = "pr-create" | "pr-update" | "pr-fix";

const INLINED_SKILL_NOTE =
  "Do not read any PR-related skills (pr-create, pr-update, pr-fix). Their instructions are inlined below.";

function stripFrontMatter(text: string): string {
  const lines = text.split("\n");
  if (lines[0]?.trim() !== "---") {
    return text;
  }
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) {
    return text;
  }
  return lines.slice(end + 1).join("\n");
}

function skillFilePath(skillName: PrSkillName): string {
  const repoSkillPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "home",
    ".agents",
    "skills",
    skillName,
    "SKILL.md"
  );
  if (fs.existsSync(repoSkillPath)) {
    return repoSkillPath;
  }
  return path.join(os.homedir(), ".agents", "skills", skillName, "SKILL.md");
}

function readSkillBody(skillName: PrSkillName): string {
  const skillPath = skillFilePath(skillName);
  const raw = fs.readFileSync(skillPath, "utf-8");
  return stripFrontMatter(raw).trim();
}

/** Inlined skill instructions to place at the top of a `pr` agent prompt. */
export function inlinedSkillLines(skillName: PrSkillName): string[] {
  return [INLINED_SKILL_NOTE, "", readSkillBody(skillName), "", "---", ""];
}
