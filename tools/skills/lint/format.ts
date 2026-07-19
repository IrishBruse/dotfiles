import process from "node:process";

import { paint, stderrColorEnabled } from "../../dotfiles/api.ts";
import type { Diagnostic } from "./types.ts";

export function formatDiagnostic(filePath: string, diagnostic: Diagnostic): string {
  const color = stderrColorEnabled();
  const location = paint(color, "label", `${filePath}:${diagnostic.line}:${diagnostic.column}`);
  const severity = paint(color, "warn", "warning");
  const code = paint(color, "dim", diagnostic.code);
  return `${location} - ${severity} ${code}: ${diagnostic.message}`;
}

export function formatSummary(
  warningCount: number,
  errorCount: number,
  filesWithWarnings: number,
  filesChecked: number
): string {
  const color = stderrColorEnabled();
  const parts: string[] = [];

  if (warningCount > 0) {
    parts.push(
      `${warningCount} warning${warningCount === 1 ? "" : "s"}`
    );
  }
  if (errorCount > 0) {
    parts.push(`${errorCount} error${errorCount === 1 ? "" : "s"}`);
  }

  const issueText = parts.join(", ");
  const fileText = `in ${filesWithWarnings} file${filesWithWarnings === 1 ? "" : "s"}`;
  return paint(
    color,
    "dim",
    `skills lint: found ${issueText} ${fileText} (checked ${filesChecked} file${filesChecked === 1 ? "" : "s"})`
  );
}

export function printDiagnostic(filePath: string, diagnostic: Diagnostic): void {
  process.stderr.write(`${formatDiagnostic(filePath, diagnostic)}\n`);
}

export function printSummary(
  warningCount: number,
  errorCount: number,
  filesWithWarnings: number,
  filesChecked: number
): void {
  if (warningCount === 0 && errorCount === 0) return;
  process.stderr.write(
    `${formatSummary(warningCount, errorCount, filesWithWarnings, filesChecked)}\n`
  );
}
