/**
 * Pull Confluence pages into `confluence/` as markdown.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { fetchPageAcli, fetchPageAcliAsync } from "./api.ts";
import { slugifyConfluenceTitle } from "./confluence-slug.ts";
import { storageToMarkdown } from "./confluence-storage-to-markdown.ts";
import { formatPageMarkdown, spaceKeyFromWebui } from "./format.ts";
import {
  confluenceRootDir,
  defaultSiteHost,
  listLocalPages,
  localPagePath,
  pageUrl
} from "./local.ts";
import { printError, printPulled, printPullSummary } from "./output.ts";
import { parsePageId } from "./page-input.ts";
import type { ChildRef, PageViewJson } from "./types.ts";

const PULL_ALL_CONCURRENCY = 4;
const DEFAULT_CONCURRENCY = 8;

function createLimiter(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            const next = queue.shift();
            if (next) next();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}

function folderBase(page: { id: string; title?: string }): string {
  return slugifyConfluenceTitle(page.title ?? "") || "page";
}

function folderNamesForSiblings(
  pages: { id: string; title?: string }[]
): string[] {
  if (pages.length === 0) return [];
  const bases = pages.map(folderBase);
  const counts = new Map<string, number>();
  for (const b of bases) {
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return pages.map((p, i) => {
    const base = bases[i]!;
    if ((counts.get(base) ?? 0) === 1) return base;
    return `${base}-${p.id}`;
  });
}

function markdownBasename(title: string | undefined, pageId: string): string {
  const t = title != null ? String(title).trim() : "";
  const s = slugifyConfluenceTitle(t || `page-${pageId}`);
  return s || `page-${pageId}`;
}

function sortChildren(children: ChildRef[]): ChildRef[] {
  return [...children].sort((a, b) => {
    const pa = a.childPosition ?? 0;
    const pb = b.childPosition ?? 0;
    if (pa !== pb) return pa - pb;
    return String(a.id).localeCompare(String(b.id));
  });
}

export type PullOptions = {
  cwd?: string;
  quiet?: boolean;
  rawStorage?: boolean;
  concurrency?: number;
  acli?: string;
};

function pageLinks(page: PageViewJson): {
  url: string;
  spaceKey: string;
} {
  const siteHost = defaultSiteHost();
  const spaceKey = spaceKeyFromWebui(page._links?.webui);
  const title = page.title?.trim() || page.id;
  const url =
    page._links?.base && page._links?.webui
      ? `${page._links.base.replace(/\/$/, "")}${page._links.webui}`
      : pageUrl(siteHost, spaceKey, page.id, title);
  return { url, spaceKey };
}

function writePulledPage(
  filePath: string,
  page: PageViewJson,
  opts: PullOptions
): string {
  const storage = page.body?.storage?.value ?? "";
  const siteHost = defaultSiteHost();
  const body = opts.rawStorage
    ? storage
    : storageToMarkdown(storage, { siteHost });
  const links = pageLinks(page);
  const content = formatPageMarkdown(page, body, links);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf-8");
  return path.relative(opts.cwd ?? process.cwd(), filePath) || filePath;
}

function writePageFile(
  dir: string,
  baseName: string,
  page: PageViewJson,
  opts: PullOptions
): string {
  const filePath = path.join(dir, `${baseName}.md`);
  return writePulledPage(filePath, page, opts);
}

async function walkSubtree(
  dir: string,
  pageId: string,
  opts: PullOptions & {
    leafSlug: string | null;
    visited: Set<string>;
    prefetched?: PageViewJson;
    fetchPage: (id: string) => Promise<PageViewJson>;
  }
): Promise<number> {
  const { leafSlug, visited, prefetched, fetchPage } = opts;
  if (visited.has(pageId)) {
    if (!opts.quiet) {
      printError(`skip duplicate id ${pageId}`);
    }
    return 0;
  }
  visited.add(pageId);

  const data = prefetched ?? (await fetchPage(pageId));
  if (data.directChildren?.meta?.hasMore && !opts.quiet) {
    printError(
      `warning: page ${pageId} has more direct children than returned; pull may be incomplete`
    );
  }

  const children = sortChildren(data.directChildren?.results ?? []);
  const baseName = leafSlug ?? markdownBasename(data.title, pageId);
  const relPath = writePageFile(dir, baseName, data, opts);
  let pulled = 1;

  if (!opts.quiet) {
    printPulled(pageId, data.title?.trim() || pageId, relPath);
  }

  if (children.length === 0) return pulled;

  const childFolders = folderNamesForSiblings(children);
  const childDatas = await Promise.all(children.map((ch) => fetchPage(ch.id)));

  const nested = await Promise.all(
    children.map(async (ch, i) => {
      const childData = childDatas[i]!;
      const seg = childFolders[i]!;
      const subKids = sortChildren(childData.directChildren?.results ?? []);
      if (subKids.length === 0) {
        if (visited.has(ch.id)) return 0;
        visited.add(ch.id);
        const childRel = writePageFile(dir, seg, childData, opts);
        if (!opts.quiet) {
          printPulled(ch.id, childData.title?.trim() || ch.id, childRel);
        }
        return 1;
      }
      const childDir = path.join(dir, seg);
      fs.mkdirSync(childDir, { recursive: true });
      return walkSubtree(childDir, ch.id, {
        ...opts,
        leafSlug: null,
        prefetched: childData,
        fetchPage
      });
    })
  );

  for (const n of nested) pulled += n;
  return pulled;
}

function pullOnePageWrite(
  pageId: string,
  opts: PullOptions
): { pageId: string; title: string; relPath: string } {
  const cwd = opts.cwd ?? process.cwd();
  const page = fetchPageAcli(pageId, opts.acli);
  const prior = localPagePath(pageId, cwd);
  const root = confluenceRootDir(cwd);
  const baseName = markdownBasename(page.title, pageId);
  const outPath =
    prior ??
    path.join(root, folderBase({ id: pageId, title: page.title }), `${baseName}.md`);
  const relPath = writePulledPage(outPath, page, opts);
  if (prior && path.resolve(prior) !== path.resolve(outPath)) {
    fs.unlinkSync(prior);
  }
  return {
    pageId,
    title: page.title?.trim() || pageId,
    relPath
  };
}

async function pullOnePageWriteAsync(
  pageId: string,
  opts: PullOptions
): Promise<{ pageId: string; title: string; relPath: string }> {
  const cwd = opts.cwd ?? process.cwd();
  const page = await fetchPageAcliAsync(pageId, opts.acli);
  const prior = localPagePath(pageId, cwd);
  const root = confluenceRootDir(cwd);
  const baseName = markdownBasename(page.title, pageId);
  const outPath =
    prior ??
    path.join(root, folderBase({ id: pageId, title: page.title }), `${baseName}.md`);
  const relPath = writePulledPage(outPath, page, opts);
  if (prior && path.resolve(prior) !== path.resolve(outPath)) {
    fs.unlinkSync(prior);
  }
  return {
    pageId,
    title: page.title?.trim() || pageId,
    relPath
  };
}

/** Pull one page tree from a page id or wiki URL. */
export async function pullPage(
  input: string,
  options: PullOptions = {}
): Promise<number> {
  const pageId = parsePageId(input);
  if (!pageId) {
    printError(`pull: not a valid Confluence page id or URL: ${input}`);
    return 1;
  }

  const cwd = options.cwd ?? process.cwd();
  const quiet = options.quiet ?? false;
  const concurrency = Math.min(
    64,
    Math.max(1, Math.floor(options.concurrency ?? DEFAULT_CONCURRENCY))
  );
  const limit = createLimiter(concurrency);
  const fetchPage = (id: string) =>
    limit(() => fetchPageAcliAsync(id, options.acli));

  try {
    const probe = await fetchPage(pageId);
    const rootSeg = folderBase({ id: pageId, title: probe.title });
    const rootDir = path.join(confluenceRootDir(cwd), rootSeg);
    const visited = new Set<string>();
    const pulled = await walkSubtree(rootDir, pageId, {
      ...options,
      cwd,
      quiet,
      leafSlug: null,
      visited,
      prefetched: probe,
      fetchPage
    });
    if (!quiet) printPullSummary(pulled);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`pull ${pageId}: ${msg}`);
    return 1;
  }
}

/** Re-pull every page already present under `confluence/`. */
export async function pullAll(
  cwd = process.cwd(),
  options: Omit<PullOptions, "cwd"> = {}
): Promise<number> {
  const pages = listLocalPages(cwd);
  if (pages.length === 0) {
    printError("no pages under confluence/");
    return 1;
  }

  const limit = createLimiter(PULL_ALL_CONCURRENCY);
  const results = await Promise.all(
    pages.map((page) =>
      limit(async () => {
        try {
          const pulled = await pullOnePageWriteAsync(page.id, {
            ...options,
            cwd,
            quiet: true
          });
          return { ok: true as const, pulled };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          printError(`pull ${page.id}: ${msg}`);
          return { ok: false as const, page };
        }
      })
    )
  );

  let code = 0;
  let pulled = 0;
  for (const result of results) {
    if (!result.ok) {
      code = 1;
      continue;
    }
    pulled += 1;
    if (!options.quiet) {
      printPulled(result.pulled.pageId, result.pulled.title, result.pulled.relPath);
    }
  }
  if (!options.quiet) printPullSummary(pulled);
  return code;
}

/** Pull a single existing page file by id (no subtree walk). */
export function pullSingle(
  pageId: string,
  options: PullOptions = {}
): number {
  try {
    const pulled = pullOnePageWrite(pageId, options);
    if (!options.quiet) {
      printPulled(pulled.pageId, pulled.title, pulled.relPath);
      printPullSummary(1);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`pull ${pageId}: ${msg}`);
    return 1;
  }
}
