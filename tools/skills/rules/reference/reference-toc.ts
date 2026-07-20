import path from "node:path";

import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

export const MIN_REFERENCE_LINES = 100;
const TOC_HEADING =
  /^#{1,6}\s+(?:contents|table of contents)\b/i;

/** @skills/reference-toc */
export function lint(content: string, filePath?: string): Diagnostic[] {
  if (filePath === undefined || isSkillMd(filePath)) return [];

  const lineCount = content.split("\n").length;
  if (lineCount <= MIN_REFERENCE_LINES) return [];

  const preview = content.split("\n").slice(0, 30);
  if (preview.some((line) => TOC_HEADING.test(line.trim()))) return [];

  return [
    {
      line: 1,
      column: 1,
      code: "reference-toc",
      message: `Reference file exceeds ${MIN_REFERENCE_LINES} lines (${lineCount}) without a table of contents near the top. Add a "## Contents" section.`,
    },
  ];
}
