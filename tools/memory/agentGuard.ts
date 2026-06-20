import { printHint } from "./output.ts";

const AGENT_VIEW_HINT = "Agents should read the memory skill instead of this command.";

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

/** Tell agents to read the skill instead of using `memory view`. */
export function printAgentViewHint(): void {
  printHint(AGENT_VIEW_HINT);
}
