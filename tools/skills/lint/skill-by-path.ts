import { forEachProseLine } from "./shared.ts";
import type { Diagnostic } from "./types.ts";

const SKILL_BY_PATH =
  /(?:~\/\.(?:agents|cursor)\/skills\/[A-Za-z0-9._-]+(?:\/SKILL\.md)?|\.(?:agents|cursor)\/skills\/[A-Za-z0-9._-]+(?:\/SKILL\.md)?)/g;

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    SKILL_BY_PATH.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = SKILL_BY_PATH.exec(prose)) !== null) {
      diagnostics.push({
        line: lineNumber,
        column: match.index + 1,
        code: "skill-by-path",
        message: `Reference skills by backtick name, not file path (found "${match[0]}").`,
      });
      if (diagnostics.length >= 3) return;
    }
  });

  return diagnostics;
}
