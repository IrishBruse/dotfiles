import { forEachProseLine } from "./shared.ts";
import type { Diagnostic } from "./types.ts";

const TOOL_MENU =
  /\b(?:you can )?use [A-Za-z][\w.-]*(?:,\s*[A-Za-z][\w.-]*){1,}(?:,\s*)?or [A-Za-z][\w.-]*/i;

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    const match = TOOL_MENU.exec(prose);
    if (!match) return;

    diagnostics.push({
      line: lineNumber,
      column: match.index + 1,
      code: "tool-menu",
      message:
        'Multiple tool options without a default. Pick one default and mention alternatives briefly.',
    });
    if (diagnostics.length >= 3) return;
  });

  return diagnostics;
}
