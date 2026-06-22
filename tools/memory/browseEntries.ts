import { runMemoryInteractive } from "./interactive.ts";

/**
 * Run bare `memory` (interactive TTY browser).
 */
export async function runInteractive(options: {
  globalOnly: boolean;
}): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("memory requires an interactive terminal.");
  }

  await runMemoryInteractive(options);
}
