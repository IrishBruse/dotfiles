import {
  contextFromArg,
  filePathFromContext,
  type LintContext,
} from "../core/context.ts";
import type { Diagnostic } from "../core/types.ts";

const SCRIPT_REF =
  /(?:`|\b)(scripts\/[A-Za-z0-9_./-]+)(?:`|\b)/g;
const CODE_SCRIPT_REF = /\b(?:python|bash|sh|node)\s+(scripts\/[A-Za-z0-9_./-]+)/g;

function checkScriptPath(
  scriptPath: string,
  context: LintContext,
  lineNumber: number,
  column: number,
  diagnostics: Diagnostic[]
): void {
  const normalized = scriptPath.replace(/^\.\//, "");
  if (context.relativeFiles.has(normalized)) return;

  diagnostics.push({
    line: lineNumber,
    column,
    code: "missing-script",
    severity: "error",
    message: `Referenced script "${normalized}" does not exist in the skill folder.`,
  });
}

export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  const context = contextFromArg(filePathOrContext);
  if (filePath === undefined || context === undefined) return [];

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    const pattern = inCodeBlock ? CODE_SCRIPT_REF : SCRIPT_REF;
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const scriptPath = match[1] ?? "";
      if (scriptPath === "" || scriptPath.includes("...")) continue;
      checkScriptPath(scriptPath, context, i + 1, match.index + 1, diagnostics);
      if (diagnostics.length >= 3) return diagnostics;
    }
  }

  return diagnostics;
}
