export type DiagnosticSeverity = "warning" | "error";

export interface Diagnostic {
  line: number;
  column: number;
  code: string;
  message: string;
  severity?: DiagnosticSeverity;
}

export function diagnosticSeverity(
  diagnostic: Diagnostic
): DiagnosticSeverity {
  return diagnostic.severity ?? "warning";
}

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.column - b.column;
}
