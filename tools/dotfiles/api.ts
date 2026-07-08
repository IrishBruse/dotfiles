import {
  paint as paintImpl,
  printError as printErrorImpl,
  stderrColorEnabled as stderrColorEnabledImpl,
  stdoutColorEnabled as stdoutColorEnabledImpl
} from "./paint.ts";

export type { PaintRole } from "./paint.ts";

/** True when stdout supports ANSI color. */
export function stdoutColorEnabled(): boolean {
  return stdoutColorEnabledImpl();
}

/** True when stderr supports ANSI color. */
export function stderrColorEnabled(): boolean {
  return stderrColorEnabledImpl();
}

/**
 * Wrap text in a semantic ANSI color when enabled.
 * @param enabled Whether color is on for this stream.
 * @param role Semantic color role.
 * @param text Text to paint.
 * @return Colored or plain text.
 */
export function paint(
  enabled: boolean,
  role: import("./paint.ts").PaintRole,
  text: string
): string {
  return paintImpl(enabled, role, text);
}

/**
 * Print an error message to stderr with red styling when supported.
 * @param message Error text.
 */
export function printError(message: string): void {
  printErrorImpl(message);
}
