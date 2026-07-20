import { forEachProseLine } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const PROSE_SEMICOLON = /[a-zA-Z][\w'']*;\s+[a-z]/g;

/** @skills/prose-semicolon */
export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    if (/https?:\/\//.test(prose)) return;
    if (
      /^\s*(import|export|const|let|var|function|return|class|interface|type|#include|using)\b/.test(
        prose
      )
    ) {
      return;
    }

    PROSE_SEMICOLON.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PROSE_SEMICOLON.exec(prose)) !== null) {
      diagnostics.push({
        line: lineNumber,
        column: match.index + 1,
        code: "prose-semicolon",
        message: `Prefer "," over ";" in English text (found "${match[0].trim()}")`,
      });
      if (diagnostics.length >= 3) return;
    }
  });

  return diagnostics;
}
