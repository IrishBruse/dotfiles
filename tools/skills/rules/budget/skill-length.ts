import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

export const MAX_SKILL_LINES = 500;

export function lint(content: string, filePath?: string): Diagnostic[] {
  if (!isSkillMd(filePath)) {
    return [];
  }

  const lineCount = content.split("\n").length;
  if (lineCount <= MAX_SKILL_LINES) return [];

  return [
    {
      line: 1,
      column: 1,
      code: "skill-length",
      severity: "error",
      message: `SKILL.md exceeds ${MAX_SKILL_LINES} lines (${lineCount}). Split reference behind pointers or into sibling files.`,
    },
  ];
}
