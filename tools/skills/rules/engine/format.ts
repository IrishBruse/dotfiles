import process from "node:process";

import { displayPath } from "../../discover.ts";
import { formatOutput, paintOutput, stripAnsi } from "./color.ts";
import { isFixableRule } from "./fixable.ts";
import { diagnosticSeverity, type Diagnostic } from "../core/types.ts";

export function formatRuleId(code: string): string {
  const suffix = isFixableRule(code) ? "(fixable)" : "";
  return `@skills/${code}${suffix}`;
}

/** Fixed width for line:column (fits 999:999). */
export const LOCATION_WIDTH = "999:999".length;

function padVisible(
  text: string,
  width: number,
  align: "left" | "right"
): string {
  const pad = Math.max(0, width - stripAnsi(text).length);
  if (pad === 0) return text;
  return align === "right"
    ? `${" ".repeat(pad)}${text}`
    : `${text}${" ".repeat(pad)}`;
}

function formatAlignedDiagnosticLines(diagnostics: Diagnostic[]): string[] {
  if (diagnostics.length === 0) return [];

  const rows = diagnostics.map((diagnostic) => ({
    location: `${diagnostic.line}:${diagnostic.column}`,
    severity: diagnosticSeverity(diagnostic),
    severityRole:
      diagnosticSeverity(diagnostic) === "error"
        ? ("bad" as const)
        : ("warn" as const),
    message: diagnostic.message,
    ruleId: formatRuleId(diagnostic.code),
  }));

  const severityWidth = Math.max(...rows.map((row) => row.severity.length));
  const messageWidth = Math.max(...rows.map((row) => row.message.length));

  return rows.map((row) => {
    const location = paintOutput(
      "label",
      padVisible(row.location, LOCATION_WIDTH, "left")
    );
    const severity = paintOutput(
      row.severityRole,
      padVisible(row.severity, severityWidth, "left")
    );
    const message = padVisible(row.message, messageWidth, "left");
    const ruleId = paintOutput("dim", row.ruleId);
    return formatOutput(
      `  ${location}  ${severity}  ${message}  ${ruleId}`
    );
  });
}

export function formatDiagnosticLine(diagnostic: Diagnostic): string {
  return formatAlignedDiagnosticLines([diagnostic])[0] ?? "";
}

/** One file path header plus indented diagnostics (line:col only). */
export function formatFileDiagnostics(
  filePath: string,
  diagnostics: Diagnostic[]
): string {
  const header = formatOutput(paintOutput("label", displayPath(filePath)));
  return [header, ...formatAlignedDiagnosticLines(diagnostics)].join("\n");
}

/** ESLint-style single line (path:line:col, message, @rule at end). */
export function formatDiagnostic(filePath: string, diagnostic: Diagnostic): string {
  const location = paintOutput(
    "label",
    `${displayPath(filePath)}:${diagnostic.line}:${diagnostic.column}`
  );
  const severity = diagnosticSeverity(diagnostic);
  const severityLabel = paintOutput(
    severity === "error" ? "bad" : "warn",
    severity
  );
  const ruleId = paintOutput("dim", formatRuleId(diagnostic.code));
  return formatOutput(
    `${location}  ${severityLabel}  ${diagnostic.message}  ${ruleId}`
  );
}

export function formatSummary(
  warningCount: number,
  errorCount: number,
  filesWithWarnings: number,
  filesChecked: number
): string {
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
  return formatOutput(
    paintOutput(
      "dim",
      `skills lint: found ${issueText} ${fileText} (checked ${filesChecked} file${filesChecked === 1 ? "" : "s"})`
    )
  );
}

export function printDiagnostic(filePath: string, diagnostic: Diagnostic): void {
  process.stderr.write(`${formatDiagnostic(filePath, diagnostic)}\n`);
}

export function printFileDiagnostics(
  filePath: string,
  diagnostics: Diagnostic[]
): void {
  if (diagnostics.length === 0) return;
  process.stderr.write(`${formatFileDiagnostics(filePath, diagnostics)}\n`);
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

export function formatFixedFiles(filePaths: string[]): string {
  if (filePaths.length === 0) return "";
  const count = filePaths.length;
  const header = formatOutput(
    paintOutput("ok", `fixed (${count} file${count === 1 ? "" : "s"})`)
  );
  const lines = filePaths.map((filePath) =>
    formatOutput(`  ${paintOutput("label", displayPath(filePath))}`)
  );
  return [header, ...lines].join("\n");
}

export function printFixedFiles(filePaths: string[]): void {
  const output = formatFixedFiles(filePaths);
  if (output.length === 0) return;
  process.stderr.write(`${output}\n`);
}
