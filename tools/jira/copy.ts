/**
 * Copy Jira ticket markdown into `<dest>/<KEY>/<KEY>.md`, using a local copy if present else pull.
 * Recursively copies child issues (initiative epics, epic stories, sub-tasks, etc.).
 * Usage: jira copy <KEY|URL> [parentDir]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fetchChildIssues, issueTreeKeys } from "./children.ts";
import { parseJiraKey } from "./jiraInput.ts";
import { localTicketPath } from "./local.ts";
import { pullTicket } from "./pull.ts";

function log(msg: string): void {
  process.stderr.write(`jira copy: ${msg}\n`);
}

function ensureLocalTicket(key: string): string | null {
  let src = localTicketPath(key);
  if (src) {
    log(`using local ${src}`);
    return src;
  }

  log(`no local ${key}.md; fetching…`);
  if (pullTicket(key, { noChildren: true }) !== 0) return null;
  return localTicketPath(key);
}

function copyTicketToDir(key: string, parentDir: string): number {
  const src = ensureLocalTicket(key);
  if (!src) {
    process.stderr.write(
      `jira copy: expected file after pull: jira/*/<title> - <KEY>.md\n`
    );
    return 1;
  }

  const outDir = path.join(parentDir, key);
  fs.mkdirSync(outDir, { recursive: true });
  const destFile = path.join(outDir, `${key}.md`);
  fs.copyFileSync(src, destFile);
  process.stdout.write(`Copied ${key} → ${outDir}/\n`);
  return 0;
}

export function run(
  input: string,
  parentDirOrUndefined: string | undefined
): number {
  try {
    return runImpl(input, parentDirOrUndefined);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`jira copy: ${msg}\n`);
    return 1;
  }
}

function runImpl(
  input: string,
  parentDirOrUndefined: string | undefined
): number {
  const key = parseJiraKey(input);
  if (!key) {
    process.stderr.write(`jira copy: not a valid Jira key or URL: ${input}\n`);
    return 1;
  }

  const parent = parentDirOrUndefined
    ? path.resolve(parentDirOrUndefined)
    : process.cwd();

  const keys = issueTreeKeys(key, fetchChildIssues);
  let code = 0;
  for (const ticketKey of keys) {
    if (copyTicketToDir(ticketKey, parent) !== 0) code = 1;
  }
  return code;
}
