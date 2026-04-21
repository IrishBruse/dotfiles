#!/usr/bin/env node
/**
 * Clone a Confluence page subtree to local markdown files using
 * `acli confluence page view --json --include-direct-children`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ACLI_DEFAULT = "acli";

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
  outDir: string;
  acli: string;
} {
  let url: string | null = null;
  let outDir: string | null = null;
  let acli = process.env.ACLI_BIN?.trim() || ACLI_DEFAULT;
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
  return {
    url,
    outDir: outDir ?? rest[1] ?? defaultOut,
    acli,
  };
}

function usage(code: number): never {
  const prog = path.basename(process.argv[1] ?? "confluence-clone");
  console.error(`Usage: ${prog} <confluencePageUrl> [outputDir]`);
  console.error(`       ${prog} --url <url> [--out|-o <dir>] [--acli <path>]`);
  console.error("");
  console.error(
    "  Clones the page and all descendants via Atlassian CLI (acli).",
  );
  console.error(`  Default output: ./confluence-<pageId>`);
  console.error("  Requires: acli authenticated (acli confluence auth).");
  process.exit(code);
}

function pageIdFromUrl(urlString: string): string | null {
  const m = String(urlString).match(/\/pages\/(\d+)/);
  return m ? m[1]! : null;
}

function runAcliPage(acli: string, pageId: string): PageViewJson {
  const r = spawnSync(
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
    { encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (r.error) {
    throw new Error(`Failed to run ${acli}: ${(r.error as Error).message}`);
  }
  if (r.status !== 0) {
    const err = r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`;
    throw new Error(err);
  }
  const raw = r.stdout?.trim() ?? "";
  try {
    return JSON.parse(raw) as PageViewJson;
  } catch {
    throw new Error(`Expected JSON from acli; got: ${raw.slice(0, 200)}…`);
  }
}

function sanitize(title: string): string {
  return title
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function folderBase(page: { id: string; title?: string }): string {
  return sanitize(page.title ?? "") || "page";
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
  const s = sanitize(t || `page-${pageId}`);
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

function buildFileContent(page: PageViewJson): string {
  const lines = ["---"];
  lines.push(`id: "${page.id}"`);
  if (page.title != null) lines.push(`title: ${JSON.stringify(page.title)}`);
  if (page.parentId != null) lines.push(`parentId: "${page.parentId}"`);
  if (page.version?.number != null)
    lines.push(`version: ${page.version.number}`);
  lines.push("---", "");
  const html = page.body?.storage?.value ?? "";
  return `${lines.join("\n")}\n${html}\n`;
}

function writePageFile(
  dir: string,
  baseName: string,
  data: PageViewJson,
): void {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${baseName}.md`);
  fs.writeFileSync(filePath, buildFileContent(data), "utf-8");
  console.error(filePath);
}

function walk(
  acli: string,
  dir: string,
  pageId: string,
  opts: {
    leafSlug: string | null;
    visited: Set<string>;
    prefetched?: PageViewJson;
  },
): void {
  const { leafSlug, visited, prefetched } = opts;
  if (visited.has(pageId)) {
    console.error(`confluence-clone: skip duplicate id ${pageId}`);
    return;
  }
  visited.add(pageId);

  const data = prefetched ?? runAcliPage(acli, pageId);
  if (data.directChildren?.meta?.hasMore) {
    console.error(
      `confluence-clone: warning: page ${pageId} has more direct children than returned; clone may be incomplete.`,
    );
  }

  const children = sortChildren(data.directChildren?.results ?? []);
  const baseName = leafSlug ?? markdownBasename(data.title, pageId);
  writePageFile(dir, baseName, data);

  const childFolders = folderNamesForSiblings(children);
  for (let i = 0; i < children.length; i++) {
    const ch = children[i]!;
    const seg = childFolders[i]!;
    const childData = runAcliPage(acli, ch.id);
    const subKids = sortChildren(childData.directChildren?.results ?? []);
    if (subKids.length === 0) {
      if (visited.has(ch.id)) continue;
      visited.add(ch.id);
      writePageFile(dir, seg, childData);
    } else {
      const childDir = path.join(dir, seg);
      fs.mkdirSync(childDir, { recursive: true });
      walk(acli, childDir, ch.id, {
        leafSlug: null,
        visited,
        prefetched: childData,
      });
    }
  }
}

function main(): void {
  const parsed = parseArgs(process.argv.slice(2));
  const pageId = pageIdFromUrl(parsed.url);
  if (!pageId) process.exit(1);

  const titleProbe = runAcliPage(parsed.acli, pageId);
  const [rootSeg] = folderNamesForSiblings([
    { id: pageId, title: titleProbe.title },
  ]);
  const rootDir = path.join(path.resolve(parsed.outDir), rootSeg);
  const visited = new Set<string>();
  walk(parsed.acli, rootDir, pageId, {
    leafSlug: null,
    visited,
    prefetched: titleProbe,
  });
  console.error(`confluence-clone: done → ${path.resolve(parsed.outDir)}`);
}

main();
