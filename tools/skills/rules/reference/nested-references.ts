import path from "node:path";

import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const MARKDOWN_LINK = /\[[^\]]+\]\(([^)]+)\)/g;

function isSkillMarkdownTarget(target: string): boolean {
  const normalized = target.split("#")[0]?.split("?")[0]?.trim() ?? "";
  return path.basename(normalized) === "SKILL.md";
}

export function lint(content: string, filePath?: string): Diagnostic[] {
  if (filePath === undefined || isSkillMd(filePath)) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    MARKDOWN_LINK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKDOWN_LINK.exec(line)) !== null) {
      const target = match[1] ?? "";
      if (!/\.md(?:$|[?#])/i.test(target)) continue;
      if (isSkillMarkdownTarget(target)) continue;

      diagnostics.push({
        line: i + 1,
        column: match.index + 1,
        code: "nested-reference",
        message:
          "Keep markdown links one level deep from SKILL.md. Link reference files from SKILL.md instead of from other reference files.",
      });
      if (diagnostics.length >= 3) return diagnostics;
    }
  }

  return diagnostics;
}
