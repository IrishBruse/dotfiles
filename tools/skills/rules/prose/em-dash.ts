import { forEachProseLine } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const EM_EN_DASH = /[\u2013\u2014]/;

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    const match = EM_EN_DASH.exec(prose);
    if (!match) return;

    diagnostics.push({
      line: lineNumber,
      column: match.index + 1,
      code: "em-dash",
      message: `Prefer "," over em/en dash (found ${JSON.stringify(match[0])}).`,
    });
    if (diagnostics.length >= 3) return;
  });

  return diagnostics;
}
