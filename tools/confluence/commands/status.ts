import process from "node:process";

import { fetchPageVersion } from "../lib/api.ts";
import { findRelativeMdLinks } from "../lib/links.ts";
import { listLocalPages } from "../lib/local.ts";
import { printError, printStatusLine } from "../lib/output.ts";
import { classifyPage } from "../lib/page-state.ts";

export type { PageStatus } from "../lib/page-state.ts";

/** Show local vs remote state for pages under `confluence/`. */
export async function runStatus(cwd = process.cwd()): Promise<number> {
  const pages = listLocalPages(cwd);
  if (pages.length === 0) {
    printError("no pages under confluence/");
    return 1;
  }

  let code = 0;
  for (const page of pages) {
    try {
      const remoteVersion = await fetchPageVersion(page.id);
      const state = classifyPage(
        page.version,
        remoteVersion,
        page.syncedHash,
        page.body
      );
      if (state !== "clean") code = 1;
      printStatusLine(state, page.id, page.title, page.relPath);
    } catch (e) {
      code = 1;
      const msg = e instanceof Error ? e.message : String(e);
      printError(`${page.id}: ${msg}`);
    }
  }

  if (code === 0) {
    process.stdout.write(`\n${pages.length} page(s) clean\n`);
  }
  return code;
}

/** Verify no relative `.md` links exist under `confluence/`. */
export function runVerify(cwd = process.cwd()): number {
  const pages = listLocalPages(cwd);
  if (pages.length === 0) {
    printError("no pages under confluence/");
    return 1;
  }

  let code = 0;
  for (const page of pages) {
    const hits = findRelativeMdLinks(page.body);
    if (hits.length === 0) continue;
    code = 1;
    for (const hit of hits) {
      printError(
        `${page.relPath}:${hit.line}:${hit.column} relative .md link: ${hit.href}`
      );
    }
  }

  if (code === 0) {
    process.stdout.write(`Verified ${pages.length} page(s)\n`);
  }
  return code;
}

/** Run `confluence status`. */
export async function runStatusCommand(cwd = process.cwd()): Promise<number> {
  return runStatus(cwd);
}

/** Run `confluence verify`. */
export function runVerifyCommand(cwd = process.cwd()): number {
  return runVerify(cwd);
}
