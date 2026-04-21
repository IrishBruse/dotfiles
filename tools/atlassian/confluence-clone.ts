#!/usr/bin/env node
/**
 * Clone a Confluence page subtree to local markdown files using
 * `acli confluence page view --json --include-direct-children`.
 */
import { execFile as execFileCb } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { slugifyConfluenceTitle } from "./confluence-slug.ts";
import { storageToMarkdown } from "./confluence-storage-to-markdown.ts";

const execFile = promisify(execFileCb);

const ACLI_DEFAULT = "acli";
const DEFAULT_CONCURRENCY = 8;

function relativeToCwd(p: string): string {
  const rel = path.relative(process.cwd(), path.resolve(p));
  return rel === "" ? "." : rel;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MiB`;
}

function sourceLabel(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

interface CloneStats {
  filesWritten: number;
  totalBytes: number;
}

interface ChildRef {
  id: string;
  title?: string;
  childPosition?: number;
}

interface PageViewJson {
  id: string;
  title?: string;
  parentId?: string;
  body?: {
    storage?: {
      representation?: string;
      value?: string;
    };
  };
  directChildren?: {
    meta?: { hasMore?: boolean };
    results?: ChildRef[];
  };
  version?: { number?: number };
}

function parseArgs(argv: string[]): {
  url: string;
  pageId: string;
  outDir: string;
  acli: string;
  rawStorage: boolean;
  concurrency: number;
} {
  let url: string | null = null;
  let outDir: string | null = null;
  let acli = process.env.ACLI_BIN?.trim() || ACLI_DEFAULT;
  let rawStorage = false;
  let concurrency = Number(process.env.CONFLUENCE_CLONE_CONCURRENCY);
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    concurrency = DEFAULT_CONCURRENCY;
  }
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--out" || a === "-o") {
      outDir = argv[++i] ?? null;
      if (!outDir) usage(1);
      continue;
    }
    if (a === "--acli") {
      const v = argv[++i];
      if (!v) usage(1);
      acli = v;
      continue;
    }
    if (a === "--url") {
      url = argv[++i] ?? null;
      if (!url) usage(1);
      continue;
    }
    if (a === "--concurrency" || a === "-j") {
      const v = argv[++i];
      if (!v) usage(1);
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1) {
        console.error("confluence-clone: --concurrency must be a positive number");
        usage(1);
      }
      concurrency = n;
      continue;
    }
    if (a === "--raw-storage") {
      rawStorage = true;
      continue;
    }
    if (a === "-h" || a === "--help") usage(0);
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      usage(1);
    }
    rest.push(a);
  }
  if (!url && rest[0]) url = rest[0];
  if (!url) usage(1);
  const pageId = pageIdFromUrl(url);
  if (!pageId) {
    console.error(
      "Could not parse page id from URL (expected .../pages/<digits>/...)",
    );
    process.exit(1);
  }
  const defaultOut = `./confluence-${pageId}`;
  const c = Math.min(64, Math.max(1, Math.floor(concurrency)));
  return {
    url,
    pageId,
    outDir: outDir ?? rest[1] ?? defaultOut,
    acli,
    rawStorage,
    concurrency: c,
  };
}

function usage(code: number): never {
  const prog = path.basename(process.argv[1] ?? "confluence-clone");
  console.error(`Usage: ${prog} <confluencePageUrl> [outputDir]`);
  console.error(
    `       ${prog} --url <url> [--out|-o <dir>] [--acli <path>] [--raw-storage] [--concurrency|-j <n>]`,
  );
  console.error("");
  console.error(
    "  Clones the page and all descendants via Atlassian CLI (acli).",
  );
  console.error(`  Default output: ./confluence-<pageId>`);
  console.error(
    "  Body is converted from Confluence storage HTML to Markdown unless --raw-storage.",
  );
  console.error(
    `  Downloads run in parallel (default ${DEFAULT_CONCURRENCY} concurrent page fetches; env CONFLUENCE_CLONE_CONCURRENCY).`,
  );
  console.error("  Requires: acli authenticated (acli confluence auth).");
  process.exit(code);
}

function pageIdFromUrl(urlString: string): string | null {
  const m = String(urlString).match(/\/pages\/(\d+)/);
  return m ? m[1]! : null;
}

async function runAcliPageAsync(
  acli: string,
  pageId: string,
): Promise<PageViewJson> {
  let stdout: string;
  try {
    const r = await execFile(
      acli,
      [
        "confluence",
        "page",
        "view",
        "--id",
        pageId,
        "--json",
        "--include-direct-children",
        "--body-format",
        "storage",
      ],
      { maxBuffer: 64 * 1024 * 1024, encoding: "utf8" },
    );
    stdout = String(r.stdout ?? "").trim();
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const msg =
      err.stderr?.toString().trim() ||
      err.stdout?.toString().trim() ||
      err.message ||
      String(e);
    throw new Error(msg);
  }
  try {
    return JSON.parse(stdout) as PageViewJson;
  } catch {
    throw new Error(`Expected JSON from acli; got: ${stdout.slice(0, 200)}…`);
  }
}

/** Bounded concurrency for subprocess-backed page fetches. */
function createFetchLimiter(concurrency: number) {
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
  pages: { id: string; title?: string }[],
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

function buildFileContent(
  page: PageViewJson,
  opts: { rawStorage: boolean },
): string {
  const lines = ["---"];
  lines.push(`id: "${page.id}"`);
  if (page.title != null) lines.push(`title: ${JSON.stringify(page.title)}`);
  if (page.parentId != null) lines.push(`parentId: "${page.parentId}"`);
  if (page.version?.number != null)
    lines.push(`version: ${page.version.number}`);
  lines.push("---", "");
  const storage = page.body?.storage?.value ?? "";
  const body = opts.rawStorage
    ? storage
    : storageToMarkdown(storage);
  return `${lines.join("\n")}\n${body}\n`;
}

function writePageFile(
  dir: string,
  baseName: string,
  data: PageViewJson,
  opts: { rawStorage: boolean; stats: CloneStats },
): void {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${baseName}.md`);
  const content = buildFileContent(data, { rawStorage: opts.rawStorage });
  fs.writeFileSync(filePath, content, "utf-8");
  opts.stats.filesWritten += 1;
  opts.stats.totalBytes += Buffer.byteLength(content, "utf8");
  console.error(relativeToCwd(filePath));
}

async function walk(
  dir: string,
  pageId: string,
  opts: {
    leafSlug: string | null;
    visited: Set<string>;
    prefetched?: PageViewJson;
    rawStorage: boolean;
    stats: CloneStats;
    fetchPage: (pageId: string) => Promise<PageViewJson>;
  },
): Promise<void> {
  const { leafSlug, visited, prefetched, rawStorage, stats, fetchPage } = opts;
  if (visited.has(pageId)) {
    console.error(`confluence-clone: skip duplicate id ${pageId}`);
    return;
  }
  visited.add(pageId);

  const data = prefetched ?? (await fetchPage(pageId));
  if (data.directChildren?.meta?.hasMore) {
    console.error(
      `confluence-clone: warning: page ${pageId} has more direct children than returned; clone may be incomplete.`,
    );
  }

  const children = sortChildren(data.directChildren?.results ?? []);
  const baseName = leafSlug ?? markdownBasename(data.title, pageId);
  writePageFile(dir, baseName, data, { rawStorage, stats });

  if (children.length === 0) return;

  const childFolders = folderNamesForSiblings(children);
  const childDatas = await Promise.all(children.map((ch) => fetchPage(ch.id)));

  await Promise.all(
    children.map(async (ch, i) => {
      const childData = childDatas[i]!;
      const seg = childFolders[i]!;
      const subKids = sortChildren(childData.directChildren?.results ?? []);
      if (subKids.length === 0) {
        if (visited.has(ch.id)) return;
        visited.add(ch.id);
        writePageFile(dir, seg, childData, { rawStorage, stats });
      } else {
        const childDir = path.join(dir, seg);
        fs.mkdirSync(childDir, { recursive: true });
        await walk(childDir, ch.id, {
          leafSlug: null,
          visited,
          prefetched: childData,
          rawStorage,
          stats,
          fetchPage,
        });
      }
    }),
  );
}

async function main(): Promise<void> {
  const parsed = parseArgs(process.argv.slice(2));
  const pageId = parsed.pageId;

  const limit = createFetchLimiter(parsed.concurrency);
  const fetchPage = (id: string) =>
    limit(() => runAcliPageAsync(parsed.acli, id));

  const titleProbe = await fetchPage(pageId);
  const [rootSeg] = folderNamesForSiblings([
    { id: pageId, title: titleProbe.title },
  ]);
  const rootDir = path.join(path.resolve(parsed.outDir), rootSeg);
  const visited = new Set<string>();
  const stats: CloneStats = { filesWritten: 0, totalBytes: 0 };
  await walk(rootDir, pageId, {
    leafSlug: null,
    visited,
    prefetched: titleProbe,
    rawStorage: parsed.rawStorage,
    stats,
    fetchPage,
  });
  const rootTitle = titleProbe.title?.trim() || `(page ${pageId})`;
  const bodyMode = parsed.rawStorage
    ? "raw Confluence storage (XML/HTML in .md bodies)"
    : "Markdown (storage HTML converted)";
  console.error("");
  console.error("confluence-clone: finished");
  console.error(`  source:   ${sourceLabel(parsed.url)}`);
  console.error(`  root:     ${rootTitle} — id ${pageId}`);
  console.error(`  output:   ${relativeToCwd(rootDir)}/`);
  console.error(
    `  wrote:    ${stats.filesWritten} page file(s), ${formatBytes(stats.totalBytes)} total`,
  );
  console.error(`  fetch:    up to ${parsed.concurrency} concurrent acli requests`);
  console.error(`  body:     ${bodyMode}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
