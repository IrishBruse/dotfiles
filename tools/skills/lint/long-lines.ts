import { MAX_LINE } from "./shared.ts";
import type { Diagnostic } from "./types.ts";

export function lint(content: string): Diagnostic[] {
  const lines = content.split("\n");
  const diagnostics: Diagnostic[] = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;
    if (line.includes("://")) continue;
    if (/^\s*\|/.test(line)) continue;
    if (line.length <= MAX_LINE) continue;

    diagnostics.push({
      line: i + 1,
      column: 1,
      code: "long-line",
      message: `Line exceeds ${MAX_LINE} characters (${line.length}). Add a newline after "." instead of one long line.`,
    });
    if (diagnostics.length >= 3) break;
  }

  return diagnostics;
}
