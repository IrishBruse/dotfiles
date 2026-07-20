import { forEachProseLine } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const HOME_REPO_PATH = /home\/\.(?:agents|cursor)\//g;

export function lint(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  forEachProseLine(content, (prose, lineNumber) => {
    HOME_REPO_PATH.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = HOME_REPO_PATH.exec(prose)) !== null) {
      diagnostics.push({
        line: lineNumber,
        column: match.index + 1,
        code: "home-repo-path",
        message: `Use runtime paths under ~/, not repo path "${match[0]}"`,
      });
      if (diagnostics.length >= 3) return;
    }
  });

  return diagnostics;
}
