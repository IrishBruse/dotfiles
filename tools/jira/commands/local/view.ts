/**
 * `jira view` -- open the local `~/jira` markdown for a ticket in VS Code.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import { parseJiraKey } from "../../lib/jiraInput.ts";
import { localTicketPath } from "../../lib/local.ts";
import type { OutputMode } from "../../lib/output-mode.ts";
import { failCommand } from "../../lib/output.ts";
import { pullTicketWrite } from "./pull.ts";

export type ViewOptions = {
  cwd?: string;
  outputMode?: OutputMode;
  /** Test hook: replace spawning `code`. */
  openEditor?: (filePath: string) => number;
};

/** Resolve a ticket key to its on-disk markdown path, pulling when missing. */
export function resolveViewPath(
  key: string,
  options: ViewOptions = {}
): string {
  const cwd = options.cwd ?? homedir();
  let filePath = localTicketPath(key, cwd);
  if (!filePath || !fs.existsSync(filePath)) {
    const pulled = pullTicketWrite(key, { quiet: true, cwd });
    filePath =
      localTicketPath(key, cwd) ?? path.resolve(cwd, pulled.relPath);
  }
  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`view ${key}: no local file after pull`);
  }
  return path.resolve(filePath);
}

function defaultOpenEditor(filePath: string): number {
  const child = spawn("code", [filePath], {
    stdio: "ignore",
    detached: true
  });
  child.unref();
  return child.pid === undefined ? 1 : 0;
}

/** Run `jira view <KEY|URL>`. User-only: opens VS Code, not for agents. */
export function runViewCommand(
  argv: string[],
  options: ViewOptions = {}
): number {
  const outputMode = options.outputMode ?? "human";
  if (outputMode === "json") {
    return failCommand(
      "view is user-only (opens VS Code); use jira show KEY",
      outputMode
    );
  }

  const input = argv[3];
  if (!input) {
    return failCommand(
      "view: missing Jira key or URL",
      options.outputMode ?? "human"
    );
  }

  const key = parseJiraKey(input);
  if (!key) {
    return failCommand(
      `view: not a valid Jira key or URL: ${input}`,
      options.outputMode ?? "human"
    );
  }

  let filePath: string;
  try {
    filePath = resolveViewPath(key, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(msg, options.outputMode ?? "human");
  }

  const open = options.openEditor ?? defaultOpenEditor;
  if (open(filePath) !== 0) {
    return failCommand(
      "view: failed to open VS Code (is `code` on PATH?)",
      outputMode
    );
  }
  return 0;
}
