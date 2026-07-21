import { forEachProseLine } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";
import {
  canAutoFixProseSemicolon,
  forEachEditableProseSegment,
  PROSE_SEMICOLON,
  shouldSkipProseSemicolonSegment,
} from "./prose-semicolons.fix.ts";

/** @skills/prose-semicolon */
export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber, rawLine) => {
    void prose;
    const fixable = canAutoFixProseSemicolon(rawLine);

    forEachEditableProseSegment(rawLine, (segment, segmentStart) => {
      if (shouldSkipProseSemicolonSegment(segment)) return;

      PROSE_SEMICOLON.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = PROSE_SEMICOLON.exec(segment)) !== null) {
        diagnostics.push({
          line: lineNumber,
          column: segmentStart + match.index + 1,
          code: "prose-semicolon",
          message: `Prefer "," over ";" in English text (found "${match[0].trim()}")`,
          fixable,
        });
        if (diagnostics.length >= 3) return;
      }
    });
  });

  return diagnostics;
}
