const RED = "\x1b[31m";
const RESET = "\x1b[0m";

export type InterpolationError = {
  line: number;
  column: number;
  message: string;
};

export function printInterpolationErrors(
  file: string,
  errors: InterpolationError[]
): void {
  for (const e of errors) {
    console.error(
      `${RED}interpolate: ${e.message} at ${file}:${e.line}:${e.column}${RESET}`
    );
  }
}
