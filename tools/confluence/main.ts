#!/usr/bin/env node
/**
 * Confluence CLI -- pull pages to local markdown and push edits back.
 */
import process from "node:process";

import { parsePageId } from "./page-input.ts";
import { pullAll, pullPage } from "./pull.ts";
import { pushAll, pushPage } from "./push.ts";
import { printError } from "./output.ts";
import { runStatus, runVerify } from "./status.ts";
import { runSync } from "./sync.ts";

function printHelp(): void {
  process.stdout.write(`Usage:
  confluence <pageUrl|pageId>        same as confluence pull <pageUrl|pageId>
  confluence pull [pageUrl|pageId]   fetch one page tree, or all local pages when omitted
  confluence push [pageId]           push one page, or all local pages when omitted
  confluence sync <path.md>          pull or push one file from frontmatter state
  confluence status                  show clean / modified / behind / links state
  confluence verify                  fail if any relative .md links remain
  confluence -h|--help               this message

Local pages live under ./confluence/ as markdown with YAML frontmatter.
Links must use full Confluence wiki URLs or Jira /browse/KEY URLs, not relative .md paths.
Requires: acli confluence auth login
`);
}

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (arg === "-h" || arg === "--help") {
    printHelp();
    return;
  }
  if (!arg) {
    printHelp();
    return;
  }

  if (arg === "pull") {
    const input = process.argv[3];
    if (!input) {
      process.exit(await pullAll());
      return;
    }
    process.exit(await pullPage(input));
    return;
  }

  if (arg === "push") {
    const input = process.argv[3];
    if (!input) {
      process.exit(await pushAll());
      return;
    }
    const pageId = parsePageId(input);
    if (!pageId) {
      printError(`push: not a valid page id or URL: ${input}`);
      process.exit(1);
    }
    process.exit(await pushPage(pageId));
    return;
  }

  if (arg === "sync") {
    const input = process.argv[3];
    if (!input) {
      printError("sync: path to a .md file is required");
      process.exit(1);
    }
    process.exit(await runSync(input));
    return;
  }

  if (arg === "status") {
    process.exit(await runStatus());
    return;
  }

  if (arg === "verify") {
    process.exit(runVerify());
    return;
  }

  const pageId = parsePageId(arg);
  if (pageId) {
    process.exit(await pullPage(arg));
    return;
  }

  printError(`unknown command or invalid page: ${arg}`);
  printHelp();
  process.exit(1);
}

main().catch((e) => {
  printError(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
