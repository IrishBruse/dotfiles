import { forEachProseLine } from "./shared.ts";
import type { Diagnostic } from "./types.ts";

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    for (let i = 0; i < prose.length; i++) {
      const ch = prose[i];
      if ((ch.codePointAt(0) ?? 0) > 127) {
        diagnostics.push({
          line: lineNumber,
          column: i + 1,
          code: "non-ascii",
          message: `Use plain ASCII (found ${JSON.stringify(ch)})`,
        });
        break;
      }
    }
    if (diagnostics.length >= 3) return;
  });

  return diagnostics;
}
