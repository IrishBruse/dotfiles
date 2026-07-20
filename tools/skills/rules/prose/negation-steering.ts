import { filePathFromContext, type LintContext } from "../core/context.ts";
import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const NEGATION_START = /^(?:-\s*)?(?:Do not|Don't|Never)\b/i;
const POSITIVE_STEERING =
  /\b(?:Use|Prefer|Instead|→|—>|->)\b|,\s*(?:use|prefer)\b/i;

/** @skills/negation-steering */
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
    const trimmed = prose.trim();
    if (!NEGATION_START.test(trimmed)) continue;
    if (POSITIVE_STEERING.test(trimmed)) continue;

    const match = NEGATION_START.exec(trimmed);
    if (!match) continue;

    diagnostics.push({
      line: i + 1,
      column: prose.indexOf(trimmed) + 1,
      code: "negation-steering",
      message:
        'Negation-only steering. Pair the guardrail with what to do instead (Use/Prefer/Instead).',
    });
    if (diagnostics.length >= 3) return diagnostics;
  }

  return diagnostics;
}
