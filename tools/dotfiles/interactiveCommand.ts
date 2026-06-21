import { runPartialPromoteInteractive } from "./interactive.ts";

/**
 * Open the partial-folder browser (TTY). Stow is preview-only until the user
 * presses s in the browser.
 *
 * @return Exit code from the interactive session.
 */
export async function runInteractiveCommand(): Promise<number> {
  return runPartialPromoteInteractive();
}
