import { forEachProseLine } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const TIME_SENSITIVE =
  /\b(?:before|after|until)\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b/i;

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    const match = TIME_SENSITIVE.exec(prose);
    if (!match) return;

    diagnostics.push({
      line: lineNumber,
      column: match.index + 1,
      code: "time-sensitive",
      message: `Time-sensitive guidance ("${match[0]}") goes stale. Move dated rules to a deprecated section or remove the date.`,
    });
    if (diagnostics.length >= 3) return;
  });

  return diagnostics;
}
