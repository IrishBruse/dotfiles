import { filePathFromContext, type LintContext } from "../core/context.ts";
import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const VAGUE_REFERENCE_DIR = /\breferences\/\b/i;
const VAGUE_SEE_REFERENCES = /\bsee references\/?\b/i;
const VAGUE_FOR_MORE =
  /\bfor more (?:information|details)\b/i;
const CONDITIONAL = /\b(?:if|when|on)\b/i;
const SPECIFIC_REFERENCE_LINK = /\[[^\]]+\]\(references\/[^)]+\.md/i;

export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  if (!isSkillMd(filePath)) return [];

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

    const prose = line.replace(/`[^`\n]+`/g, "");

    if (SPECIFIC_REFERENCE_LINK.test(line)) continue;

    if (VAGUE_SEE_REFERENCES.test(prose)) {
      diagnostics.push({
        line: i + 1,
        column: prose.search(VAGUE_SEE_REFERENCES) + 1,
        code: "vague-pointer",
        message:
          'Vague reference pointer. Name the specific file and when to load it (for example, "If the API returns non-200, read references/api-errors.md").',
      });
      if (diagnostics.length >= 3) return diagnostics;
      continue;
    }

    if (VAGUE_FOR_MORE.test(prose)) {
      const start = Math.max(0, prose.search(VAGUE_FOR_MORE) - 80);
      const window = prose.slice(start);
      if (!CONDITIONAL.test(window)) {
        diagnostics.push({
          line: i + 1,
          column: prose.search(VAGUE_FOR_MORE) + 1,
          code: "vague-pointer",
          message:
            'Vague reference pointer without a trigger. Add when to load the material (if/when/on ...).',
        });
        if (diagnostics.length >= 3) return diagnostics;
      }
      continue;
    }

    if (VAGUE_REFERENCE_DIR.test(prose) && !/references\/[A-Za-z0-9_.-]+\.md/.test(prose)) {
      diagnostics.push({
        line: i + 1,
        column: prose.search(VAGUE_REFERENCE_DIR) + 1,
        code: "vague-pointer",
        message:
          'Generic references/ pointer. Link a specific file and state when to read it.',
      });
      if (diagnostics.length >= 3) return diagnostics;
    }
  }

  return diagnostics;
}
