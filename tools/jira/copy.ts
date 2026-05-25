/**
 * Copy a Jira ticket markdown into `<dest>/<KEY>/<KEY>.md`, using a local copy if present else pull.
 * Usage: jira copy <KEY|URL> [parentDir]
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { findLocalTicketMarkdown, JIRA_MISC_DIR } from "./jiraTicketsPaths.ts";
import { parseJiraKey } from "./jiraInput.ts";
import { run as runPull } from "./pull.ts";

function log(msg: string): void {
  process.stderr.write(`jira copy: ${msg}\n`);
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

  let src = findLocalTicketMarkdown(key);
  if (src) {
    log(`using local ${src}`);
  } else {
    log(`no local ${key}.md; fetching…`);
    const code = runPull(key);
    if (code !== 0) return code;
    src = path.join(JIRA_MISC_DIR, `${key}.md`);
    if (!fs.existsSync(src)) {
      process.stderr.write(`jira copy: expected file after pull: ${src}\n`);
      return 1;
    }
  }

  const outDir = path.join(parent, key);
  fs.mkdirSync(outDir, { recursive: true });
  const destFile = path.join(outDir, `${key}.md`);
  fs.copyFileSync(src, destFile);
  process.stdout.write(`Copied ${key} → ${outDir}/\n`);
  return 0;
}
