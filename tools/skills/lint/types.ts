export interface Diagnostic {
  line: number;
  column: number;
  code: string;
  message: string;
}

export function compareDiagnostics(a: Diagnostic, b: Diagnostic): number {
  if (a.line !== b.line) return a.line - b.line;
  return a.column - b.column;
}
