import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

import { jiraRootDir } from "./local.ts";

const sessionErrors: string[] = [];

/** Reset collected errors at the start of each CLI invocation. */
export function resetJiraCommandLogSession(): void {
  sessionErrors.length = 0;
}

/** Record an error message for the current CLI invocation. */
export function noteJiraCommandError(message: string): void {
  const trimmed = message.trim();
  if (!trimmed) return;
  sessionErrors.push(trimmed);
}

/** Collected errors for the current CLI invocation. */
export function jiraCommandLogErrors(): readonly string[] {
  return sessionErrors;
}

/** Local calendar date as YYYY-MM-DD for daily log filenames. */
export function localDateYmd(date = new Date()): string {
  return date.toLocaleDateString("en-CA");
}

/** Absolute path to today's command log under ~/jira/logs/. */
export function jiraCommandLogPath(baseDir = homedir(), date = new Date()): string {
  return path.join(jiraRootDir(baseDir), "logs", `${localDateYmd(date)}.log`);
}

/** Shell-ish arg formatting for log lines. */
export function formatJiraLogArg(arg: string): string {
  if (/^[\w@./:=,-]+$/.test(arg)) return arg;
  return JSON.stringify(arg);
}

/** Format argv as `jira <subcommand> ...` (args only, no stdout/stderr capture). */
export function formatJiraCommandLine(argv: string[]): string {
  const rest = argv.slice(2);
  const args = rest[0] === "jira" ? rest : ["jira", ...rest];
  return args.map(formatJiraLogArg).join(" ");
}

export type JiraCommandLogEntry = {
  argv: string[];
  exitCode: number;
  errors?: readonly string[];
  at?: Date;
  baseDir?: string;
};

/** Build one log record: timestamp, exit code, command, optional errors. */
export function formatJiraCommandLogEntry(entry: JiraCommandLogEntry): string {
  const at = entry.at ?? new Date();
  const command = formatJiraCommandLine(entry.argv);
  const errors = entry.errors ?? [];
  const header = `${at.toISOString()}\texit=${entry.exitCode}\t${command}`;
  if (errors.length === 0) {
    return `${header}\n`;
  }
  const detail = errors.map((error) => `  error: ${error}`).join("\n");
  return `${header}\n${detail}\n`;
}

/** Append one command record to ~/jira/logs/YYYY-MM-DD.log. Failures are ignored. */
export function appendJiraCommandLog(entry: JiraCommandLogEntry): void {
  try {
    const baseDir = entry.baseDir ?? homedir();
    const logPath = jiraCommandLogPath(baseDir, entry.at);
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(
      logPath,
      formatJiraCommandLogEntry({
        ...entry,
        errors: entry.errors ?? sessionErrors
      }),
      "utf-8"
    );
  } catch {
    // Logging must not break the CLI.
  }
}
