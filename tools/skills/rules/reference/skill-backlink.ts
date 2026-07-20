import path from "node:path";

import { filePathFromContext, type LintContext } from "../core/context.ts";
import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const MARKDOWN_LINK = /\[[^\]]+\]\(([^)]+)\)/g;
const BACKTICK_SKILL = /`(?:\.\.\/)?SKILL\.md`/g;
const PLAIN_SKILL_REF = /\b(?:see|read)\s+SKILL\.md\b/i;

function stripInlineCode(text: string): string {
  return text.replace(/`[^`\n]+`/g, "");
}

function targetsSkillMd(target: string): boolean {
  const normalized = target.split("#")[0]?.split("?")[0]?.trim() ?? "";
  return path.basename(normalized) === "SKILL.md";
}

export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
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

    const prose = stripInlineCode(line);

    MARKDOWN_LINK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKDOWN_LINK.exec(prose)) !== null) {
      const target = match[1] ?? "";
      if (!targetsSkillMd(target)) continue;

      diagnostics.push({
        line: i + 1,
        column: match.index + 1,
        code: "skill-backlink",
        message:
          "Do not link back to SKILL.md from reference files. SKILL.md is the entry point.",
      });
      if (diagnostics.length >= 3) return diagnostics;
    }

    BACKTICK_SKILL.lastIndex = 0;
    while ((match = BACKTICK_SKILL.exec(line)) !== null) {
      diagnostics.push({
        line: i + 1,
        column: match.index + 1,
        code: "skill-backlink",
        message:
          "Do not reference SKILL.md from reference files. SKILL.md is the entry point.",
      });
      if (diagnostics.length >= 3) return diagnostics;
    }

    const plainMatch = PLAIN_SKILL_REF.exec(prose);
    if (plainMatch) {
      diagnostics.push({
        line: i + 1,
        column: plainMatch.index + 1,
        code: "skill-backlink",
        message:
          "Do not point readers back to SKILL.md. SKILL.md is the entry point.",
      });
      if (diagnostics.length >= 3) return diagnostics;
    }
  }

  return diagnostics;
}
