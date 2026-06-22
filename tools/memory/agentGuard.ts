import process from "node:process";

/** True when the shell was started by a Cursor agent session. */
export function isCursorAgent(): boolean {
  return Boolean(process.env.CURSOR_AGENT);
}

/**
 * Block Cursor agent shell sessions from running human-only commands.
 * Cursor sets `CURSOR_AGENT` when the shell tool runs inside an agent turn.
 */
export function assertHumanShell(command: string): void {
  if (isCursorAgent()) {
    throw new Error(
      `memory ${command} is human-only and cannot run from a Cursor agent session.`
    );
  }
}
