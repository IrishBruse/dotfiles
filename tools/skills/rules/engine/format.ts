import process from "node:process";

import { displayPath } from "../../discover.ts";
import { formatOutput, paintOutput, stripAnsi } from "./color.ts";
import { isFixableDiagnostic, isFixableRule } from "./fixable.ts";
import { diagnosticSeverity, type Diagnostic } from "../core/types.ts";

export function formatRuleId(code: string): string {
  const suffix = isFixableRule(code) ? "(fixable)" : "";
  return `@skills/${code}${suffix}`;
}

function formatStyledRuleId(diagnostic: Diagnostic): string {
  const id = `@skills/${diagnostic.code}`;
  if (!isFixableDiagnostic(diagnostic)) {
    return paintOutput("dim", id);
  }
  return `${paintOutput("dim", id)}${paintOutput("ok", "(fixable)")}`;
}

/** Fixed width for line:column (fits 999:999). */
export const LOCATION_WIDTH = "999:999".length;

/** Fixed width for severity labels (fits "warning"). */
export const SEVERITY_WIDTH = "warning".length;

function formatSeverityLabel(severity: ReturnType<typeof diagnosticSeverity>): string {
  const role = severity === "error" ? ("bad" as const) : ("warn" as const);
  return paintOutput(role, padVisible(severity, SEVERITY_WIDTH, "left"));
}

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
    message: diagnostic.message,
    diagnostic,
  }));

  const messageWidth = Math.max(...rows.map((row) => row.message.length));

  return rows.map((row) => {
    const location = paintOutput(
      "label",
      padVisible(row.location, LOCATION_WIDTH, "left")
    );
    const severity = formatSeverityLabel(row.severity);
    const message = padVisible(row.message, messageWidth, "left");
    const ruleId = formatStyledRuleId(row.diagnostic);
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
  const severityLabel = formatSeverityLabel(diagnosticSeverity(diagnostic));
  const ruleId = formatStyledRuleId(diagnostic);
  return formatOutput(
    `${location}  ${severityLabel}  ${diagnostic.message}  ${ruleId}`
  );
}

export function formatSummary(
  warningCount: number,
  errorCount: number,
  fixableCount: number,
  filesWithWarnings: number,
  filesChecked: number
): string {
  const issueParts: string[] = [];

  if (warningCount > 0) {
    issueParts.push(
      paintOutput(
        "warn",
        `${warningCount} warning${warningCount === 1 ? "" : "s"}`
      )
    );
  }
  if (errorCount > 0) {
    issueParts.push(
      paintOutput("bad", `${errorCount} error${errorCount === 1 ? "" : "s"}`)
    );
  }
  if (fixableCount > 0) {
    issueParts.push(
      paintOutput("ok", `${fixableCount} fixable`)
    );
  }

  const issueText = issueParts.join(paintOutput("dim", ", "));
  const fileText = [
    paintOutput("dim", "in "),
    paintOutput(
      "label",
      `${filesWithWarnings} file${filesWithWarnings === 1 ? "" : "s"}`
    ),
  ].join("");
  const checkedText = [
    paintOutput("dim", "(checked "),
    paintOutput(
      "label",
      `${filesChecked} file${filesChecked === 1 ? "" : "s"}`
    ),
    paintOutput("dim", ")"),
  ].join("");

  return formatOutput(
    [
      paintOutput("dim", "skills lint: found "),
      issueText,
      paintOutput("dim", " "),
      fileText,
      paintOutput("dim", " "),
      checkedText,
    ].join("")
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
  process.stderr.write(`${formatFileDiagnostics(filePath, diagnostics)}\n\n`);
}

export function printSummary(
  warningCount: number,
  errorCount: number,
  fixableCount: number,
  filesWithWarnings: number,
  filesChecked: number
): void {
  if (warningCount === 0 && errorCount === 0) return;
  process.stderr.write(
    `${formatSummary(warningCount, errorCount, fixableCount, filesWithWarnings, filesChecked)}\n`
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
