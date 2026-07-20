import { forEachProseLine } from "./shared.ts";
import type { Diagnostic } from "./types.ts";

const WINDOWS_PATH = /\b[\w.-]+(?:\\[\w.-]+)+\b/g;

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    WINDOWS_PATH.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WINDOWS_PATH.exec(prose)) !== null) {
      diagnostics.push({
        line: lineNumber,
        column: match.index + 1,
        code: "windows-path",
        message: `Use forward slashes in file paths (found "${match[0]}").`,
      });
      if (diagnostics.length >= 3) return;
    }
  });

  return diagnostics;
}
