import fs from "node:fs";
import process from "node:process";

import { updatePageStorage } from "./api.ts";
import { assertNoRelativeMdLinks } from "./links.ts";
import {
  listLocalPages,
  parsePageMarkdown,
  resolvePageFilePath
} from "./local.ts";
import { markdownToStorage } from "./markdown-to-storage.ts";
import { printError } from "./output.ts";
import { pullSingle } from "./pull.ts";

export type PushOptions = {
  cwd?: string;
  quiet?: boolean;
  /** Push this markdown file instead of resolving under `confluence/`. */
  filePath?: string;
};

/** Push one markdown file to Confluence, then refresh frontmatter in place. */
export async function pushPageFile(
  filePath: string,
  cwd = process.cwd(),
  options: Pick<PushOptions, "quiet"> = {}
): Promise<void> {
  const content = fs.readFileSync(filePath, "utf-8");
  const page = parsePageMarkdown(content, filePath, cwd);
  if (!page) {
    throw new Error(`could not parse page markdown: ${filePath}`);
  }

  assertNoRelativeMdLinks(page.body, page.relPath);
  await updatePageStorage({
    id: page.id,
    title: page.title,
    version: page.version,
    storageBody: markdownToStorage(page.body)
  });

  const code = pullSingle(page.id, {
    cwd,
    quiet: true,
    filePath
  });
  if (code !== 0) {
    throw new Error(`refresh failed after push for page ${page.id}`);
  }

  if (!options.quiet) {
    process.stdout.write(`Pushed ${page.id} to Confluence\n`);
  }
}

/** Push one local page to Confluence, then refresh the file from Confluence. */
export async function pushPage(
  pageId: string,
  cwd = process.cwd(),
  options: PushOptions = {}
): Promise<number> {
  try {
    const filePath = resolvePageFilePath(pageId, cwd, options.filePath);
    if (!filePath) {
      printError(`no local file for page ${pageId}`);
      return 1;
    }

    await pushPageFile(filePath, cwd, options);
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
      await pushPageFile(page.path, cwd, options);
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
