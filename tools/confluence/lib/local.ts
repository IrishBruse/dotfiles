import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { CONFIG } from "./CONFIG.ts";
import type { LocalPage } from "./types.ts";

function parseFrontmatterScalar(fm: string, field: string): string {
  const m = new RegExp(`^${field}:\\s*(.+)$`, "m").exec(fm);
  if (!m) return "";
  try {
    return JSON.parse(m[1]!) as string;
  } catch {
    return m[1]!.trim();
  }
}

function parseFrontmatterNumber(fm: string, field: string): number {
  const m = new RegExp(`^${field}:\\s*(\\d+)`, "m").exec(fm);
  return m ? Number(m[1]) : 0;
}

function parseFrontmatterLine(fm: string, field: string): string {
  const m = new RegExp(`^${field}:\\s*(\\S+)$`, "m").exec(fm);
  return m?.[1] ?? "";
}

/** Stable hash of markdown body content for local change detection. */
export function hashBody(body: string): string {
  return createHash("sha256").update(body, "utf-8").digest("hex").slice(0, 16);
}

/** Parse a pulled Confluence markdown file. */
export function parsePageMarkdown(
  content: string,
  filePath: string,
  cwd = process.cwd()
): LocalPage | null {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(content);
  if (!m) return null;

  const fm = m[1]!;
  const id = parseFrontmatterLine(fm, "id").replace(/^"|"$/g, "");
  if (!id) return null;

  const title = parseFrontmatterScalar(fm, "title") || id;
  const body = m[2]!.trim();

  return {
    id,
    path: filePath,
    relPath: path.relative(cwd, filePath) || filePath,
    title,
    parentId: parseFrontmatterLine(fm, "parentId").replace(/^"|"$/g, ""),
    version: parseFrontmatterNumber(fm, "version"),
    url: parseFrontmatterLine(fm, "url"),
    spaceKey: parseFrontmatterScalar(fm, "spaceKey"),
    syncedHash: parseFrontmatterLine(fm, "syncedHash"),
    body
  };
}

export function confluenceRootDir(cwd = process.cwd()): string {
  return path.join(cwd, "confluence");
}

function walkMarkdownFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      walkMarkdownFiles(p, out);
      continue;
    }
    if (ent.isFile() && ent.name.endsWith(".md")) {
      out.push(p);
    }
  }
}

/** All Confluence markdown files under `confluence/`, sorted by path. */
export function listLocalPages(cwd = process.cwd()): LocalPage[] {
  const root = confluenceRootDir(cwd);
  const files: string[] = [];
  walkMarkdownFiles(root, files);

  const pages: LocalPage[] = [];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parsePageMarkdown(content, filePath, cwd);
    if (parsed) pages.push(parsed);
  }

  pages.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return pages;
}

/** Resolve a page id to its on-disk markdown path under cwd. */
export function localPagePath(
  pageId: string,
  cwd = process.cwd()
): string | null {
  for (const page of listLocalPages(cwd)) {
    if (page.id === pageId) return page.path;
  }
  return null;
}

/**
 * Resolve the markdown file for push/pull/sync.
 * Explicit `filePath` wins, then a registered file under `confluence/`.
 *
 * @param pageId Confluence page id from frontmatter.
 * @param cwd Working directory for relative paths.
 * @param filePath Optional caller-provided markdown path.
 * @return Absolute path, or null when no file is known.
 */
export function resolvePageFilePath(
  pageId: string,
  cwd = process.cwd(),
  filePath?: string
): string | null {
  if (filePath) return path.resolve(cwd, filePath);
  return localPagePath(pageId, cwd);
}

/** Build canonical wiki URL for a page. */
export function pageUrl(
  siteHost: string,
  spaceKey: string,
  pageId: string,
  title: string
): string {
  const site = siteHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const slug = encodeURIComponent(title.trim().replace(/\s+/g, "+"));
  if (spaceKey) {
    return `https://${site}/wiki/spaces/${spaceKey}/pages/${pageId}/${slug}`;
  }
  return `https://${site}/wiki/pages/viewpage.action?pageId=${pageId}`;
}

/** Build Jira browse URL for an issue key. */
export function jiraBrowseUrl(siteHost: string, key: string): string {
  const site = siteHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${site}/browse/${key}`;
}

export function defaultSiteHost(): string {
  return CONFIG.site.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
