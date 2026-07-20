import { forEachProseLine } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern: /\bhandle errors appropriately\b/i,
    label: "handle errors appropriately",
  },
  { pattern: /\bfollow best practices\b/i, label: "follow best practices" },
  { pattern: /\bas needed\b/i, label: "as needed" },
  {
    pattern: /\bwhen (?:necessary|appropriate)\b/i,
    label: "when necessary/appropriate",
  },
  { pattern: /\bmake sure to\b/i, label: "make sure to" },
];

/** @skills/generic-advice */
export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    for (const { pattern, label } of PATTERNS) {
      pattern.lastIndex = 0;
      const match = pattern.exec(prose);
      if (!match) continue;

      diagnostics.push({
        line: lineNumber,
        column: match.index + 1,
        code: "generic-advice",
        message: `Generic filler phrase "${label}". Replace with a specific procedure or cut it.`,
      });
      if (diagnostics.length >= 3) return;
    }
  });

  return diagnostics;
}
