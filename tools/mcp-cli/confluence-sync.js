#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const CLOUD_ID = process.argv[2];
const SPACE_KEY = process.argv[3];
const OUTPUT_DIR = process.argv[4] || `./confluence-${SPACE_KEY}`;

if (!CLOUD_ID || !SPACE_KEY) {
  console.error("Usage: node confluence-sync.js <cloudId> <spaceKey> [outputDir]");
  console.error("");
  console.error("To get your cloudId:");
  console.error("  mcp atlassian getAccessibleAtlassianResources");
  console.error("");
  console.error("To list spaces:");
  console.error(`  mcp atlassian getConfluenceSpaces --cloudId <cloudId>`);
  process.exit(1);
}

function mcp(...args) {
  const cmd = `mcp atlassian ${args.map(a => `"${a}"`).join(" ")}`;
  try {
    return execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (e) {
    return e.stdout?.toString().trim() || '{"error":true,"message":"' + e.message + '"}';
  }
}

function indent(level) {
  return "  ".repeat(level);
}

function sanitize(title) {
  return title.replace(/[\/\\:*?"<>|]/g, "-").replace(/\s+/g, "-").slice(0, 200);
}

function getSpaceId(spaceKey) {
  const raw = mcp("getConfluenceSpaces", "--cloudId", CLOUD_ID, "--keys", spaceKey);
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data.results?.[0]?.id ?? data[0]?.id;
}

function getPages(spaceId, cursor) {
  const args = ["getPagesInConfluenceSpace", "--cloudId", CLOUD_ID, "--spaceId", spaceId, "--contentFormat", "markdown", "--limit", "250"];
  if (cursor) args.push("--cursor", cursor);
  const raw = mcp(...args);
  return JSON.parse(raw);
}

function getPage(pageId) {
  const raw = mcp("getConfluencePage", "--cloudId", CLOUD_ID, "--pageId", pageId, "--contentFormat", "markdown");
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data;
}

function getChildren(pageId) {
  const raw = mcp("getConfluencePageDescendants", "--cloudId", CLOUD_ID, "--pageId", pageId, "--limit", "250");
  const data = JSON.parse(raw);
  if (data.error) return [];
  return data.results ?? data ?? [];
}

function savePage(dir, title, pageId) {
  mkdirSync(dir, { recursive: true });
  const filename = `${sanitize(title)}.md`;
  try {
    const page = getPage(pageId);
    const content = page.content ?? JSON.stringify(page, null, 2);
    writeFileSync(join(dir, filename), content, "utf-8");
    return true;
  } catch (e) {
    const errorPath = join(dir, `${sanitize(title)}.error.txt`);
    writeFileSync(errorPath, e.message, "utf-8");
    return false;
  }
}

function syncPage(dir, title, pageId, level) {
  const prefix = indent(level);
  console.log(`${prefix}├── ${title}`);

  const success = savePage(dir, title, pageId);

  const children = getChildren(pageId);
  for (const child of children) {
    const childDir = join(dir, sanitize(child.title));
    syncPage(childDir, child.title, child.id, level + 1);
  }

  return { title, success, children: children.length };
}

// Main
console.log(`Syncing space ${SPACE_KEY} to ${OUTPUT_DIR}\n`);

const spaceId = getSpaceId(SPACE_KEY);
if (!spaceId) {
  console.error(`Space "${SPACE_KEY}" not found`);
  process.exit(1);
}

// Get all top-level pages
const topPages = [];
let cursor;
do {
  const data = getPages(spaceId, cursor);
  if (data.error) throw new Error(data.message);
  const pages = data.results ?? data ?? [];
  topPages.push(...pages);
  cursor = data._links?.next ? "next" : undefined;
} while (cursor);

console.log(`Found ${topPages.length} top-level pages\n`);

mkdirSync(OUTPUT_DIR, { recursive: true });

let total = 0;
for (const page of topPages) {
  const result = syncPage(join(OUTPUT_DIR, sanitize(page.title)), page.title, page.id, 0);
  total += 1 + result.children;
}

console.log(`\nDone. Synced ${total} pages to ${OUTPUT_DIR}`);
