import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type PrSkillBranch = "compose" | "fix";

const INLINED_SKILL_NOTE =
  "Do not read any PR-related skills (pr) or their reference files. Their instructions are inlined below.";

const SKILL_DIR = "pr";

const BRANCH_REFS: Record<PrSkillBranch, string[]> = {
  compose: [
    path.join(SKILL_DIR, "compose.md"),
    path.join(SKILL_DIR, "body-format.md")
  ],
  fix: [path.join(SKILL_DIR, "fix.md")]
};

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
export function inlinedSkillLines(branch: PrSkillBranch): string[] {
  const lines = [
    INLINED_SKILL_NOTE,
    "",
    readSkillFile(path.join(SKILL_DIR, "SKILL.md"))
  ];
  for (const ref of BRANCH_REFS[branch]) {
    lines.push("", readSkillFile(ref));
  }
  lines.push("", "---", "");
  return lines;
}
