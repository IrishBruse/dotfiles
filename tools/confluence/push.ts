import fs from "node:fs";
import process from "node:process";

import { updatePageStorage } from "./api.ts";
import { assertNoRelativeMdLinks } from "./links.ts";
import { listLocalPages, localPagePath, parsePageMarkdown } from "./local.ts";
import { markdownToStorage } from "./markdown-to-storage.ts";
import { printError } from "./output.ts";
import { pullSingle } from "./pull.ts";

/** Push one local page to Confluence, then refresh the file from Confluence. */
export async function pushPage(
  pageId: string,
  cwd = process.cwd(),
  options: { quiet?: boolean } = {}
): Promise<number> {
  try {
    const filePath = localPagePath(pageId, cwd);
    if (!filePath) {
      printError(`no local file for page ${pageId}`);
      return 1;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const page = parsePageMarkdown(content, filePath, cwd);
    if (!page) {
      printError(`could not parse page markdown: ${filePath}`);
      return 1;
    }
    assertNoRelativeMdLinks(page.body, page.relPath);
    await updatePageStorage({
      id: page.id,
      title: page.title,
      version: page.version,
      storageBody: markdownToStorage(page.body)
    });
    pullSingle(page.id, { cwd, quiet: true });
    if (!options.quiet) {
      process.stdout.write(`Pushed ${page.id} to Confluence\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(msg);
    return 1;
  }
}

/** Push every local page under `confluence/` to Confluence. */
export async function pushAll(
  cwd = process.cwd(),
  options: { quiet?: boolean } = {}
): Promise<number> {
  const pages = listLocalPages(cwd);
  if (pages.length === 0) {
    printError("no pages under confluence/");
    return 1;
  }

  let code = 0;
  for (const page of pages) {
    try {
      assertNoRelativeMdLinks(page.body, page.relPath);
      await updatePageStorage({
        id: page.id,
        title: page.title,
        version: page.version,
        storageBody: markdownToStorage(page.body)
      });
      pullSingle(page.id, { cwd, quiet: true });
      if (!options.quiet) {
        process.stdout.write(`Pushed ${page.id}\n`);
      }
    } catch (e) {
      code = 1;
      const msg = e instanceof Error ? e.message : String(e);
      printError(`${page.id}: ${msg}`);
    }
  }
  return code;
}
