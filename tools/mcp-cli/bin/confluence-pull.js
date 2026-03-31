#!/usr/bin/env node
import { execSync } from "child_process";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

function parseArgs(argv) {
  const USE_SPACE_ID = argv.includes("--spaceId");
  let rootPageId = null;
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spaceId") continue;
    if (a === "--root") {
      rootPageId = argv[++i];
      if (!rootPageId) {
        console.error("Missing value for --root <pageId>");
        process.exit(1);
      }
      continue;
    }
    if (a === "--url") {
      const url = argv[++i];
      if (!url) {
        console.error("Missing value for --url <confluencePageUrl>");
        process.exit(1);
      }
      const m = String(url).match(/\/pages\/(\d+)/);
      if (!m) {
        console.error("Could not find page id in URL (expected .../pages/<id>/...)");
        process.exit(1);
      }
      rootPageId = m[1];
      continue;
    }
    out.push(a);
  }
  return { USE_SPACE_ID, rootPageId, positional: out };
}

const { USE_SPACE_ID, rootPageId, positional } = parseArgs(process.argv.slice(2));

const CLOUD_ID = positional[0];
/** Full-space mode: [cloudId, spaceKey, outputDir?]. Root mode: [cloudId, outputDir?] */
const SPACE_KEY = rootPageId ? undefined : positional[1];
const OUTPUT_DIR = rootPageId
  ? positional[1] || `./confluence-${rootPageId}`
  : positional[2] || `./confluence-${SPACE_KEY}`;

if (!CLOUD_ID || (!rootPageId && !SPACE_KEY)) {
  console.error("Usage:");
  console.error("  Full space:  node confluence-pull.js <cloudId> <spaceKey|spaceId> [outputDir] [--spaceId]");
  console.error("  Subtree:     node confluence-pull.js <cloudId> [outputDir] --root <pageId>");
  console.error("  Subtree:     node confluence-pull.js <cloudId> [outputDir] --url <confluencePageUrl>");
  console.error("");
  console.error("To get your cloudId:");
  console.error("  mcp atlassian getAccessibleAtlassianResources");
  console.error("");
  console.error("To list spaces:");
  console.error("  mcp atlassian getConfluenceSpaces --cloudId <cloudId>");
  process.exit(1);
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function mcp(toolName, args = {}) {
  const flags = Object.entries(args).map(([k, v]) => `--${k} ${JSON.stringify(v)}`).join(" ");
  const cmd = `mcp atlassian "${toolName}" ${flags}`;
  try {
    return stripAnsi(execSync(cmd, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })).trim();
  } catch (e) {
    return stripAnsi(e.stdout?.toString().trim()) || '{"error":true,"message":"' + e.message + '"}';
  }
}

function indent(level) {
  return "  ".repeat(level);
}

function sanitize(title) {
  return title.replace(/[\/\\:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

function yamlEscape(val) {
  if (val == null) return "null";
  const str = String(val);
  if (/[\n:"'{}\[\],&*!|>%@`#]/.test(str) || str === "" || str === "true" || str === "false" || str === "null" || /^\d/.test(str)) {
    return JSON.stringify(str);
  }
  return str;
}

function buildFrontmatter(page) {
  const lines = ["---"];
  const fields = [
    ["id", page.id],
    ["title", page.title],
    ["type", page.type],
    ["status", page.status],
    ["spaceId", page.spaceId],
    ["parentId", page.parentId],
    ["createdAt", page.createdAt],
    ["version", page.version?.number],
  ];
  for (const [key, val] of fields) {
    if (val != null) lines.push(`${key}: ${yamlEscape(val)}`);
  }
  lines.push("---");
  return lines.join("\n");
}

function cleanContent(body) {
  if (!body) return "";
  let text = body;
  text = text.replace(/<custom data-type="emoji"[^>]*>(:?\w+)<\/custom>/g, "$1");
  text = text.replace(/<custom data-type="mention"[^>]*>(@?\w+)<\/custom>/g, "$1");
  text = text.replace(/<custom data-type="date"[^>]*>([^<]*)<\/custom>/g, "$1");
  text = text.replace(/<custom data-type="placeholder"[^>]*>.*?<\/custom>/g, "");
  text = text.replace(/<custom[^>]*>.*?<\/custom>/g, "");
  text = text.replace(/!\[\]\(blob:[^)]*\)/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

function getSpaceId(spaceKey) {
  const raw = mcp("getConfluenceSpaces", { cloudId: CLOUD_ID, keys: spaceKey });
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data.results?.[0]?.id ?? data[0]?.id;
}

function getPages(spaceId, cursor) {
  const args = { cloudId: CLOUD_ID, spaceId, contentFormat: "markdown", limit: 250 };
  if (cursor) args.cursor = cursor;
  const raw = mcp("getPagesInConfluenceSpace", args);
  return JSON.parse(raw);
}

function getPage(pageId) {
  const raw = mcp("getConfluencePage", { cloudId: CLOUD_ID, pageId, contentFormat: "markdown" });
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data;
}

function getChildren(pageId) {
  const raw = mcp("getConfluencePageDescendants", { cloudId: CLOUD_ID, pageId, limit: 250 });
  const data = JSON.parse(raw);
  if (data.error) return [];
  return data.results ?? data ?? [];
}

function savePage(dir, title, pageId) {
  mkdirSync(dir, { recursive: true });
  const filename = `${sanitize(title)}.md`;
  try {
    const page = getPage(pageId);
    const body = page.body ?? page.content ?? "";
    const frontmatter = buildFrontmatter(page);
    const clean = cleanContent(body);
    const output = `${frontmatter}\n\n${clean}\n`;
    writeFileSync(join(dir, filename), output, "utf-8");
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
if (rootPageId) {
  console.log(`Syncing subtree from page ${rootPageId} to ${OUTPUT_DIR}\n`);
  const rootPage = getPage(rootPageId);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const result = syncPage(
    join(OUTPUT_DIR, sanitize(rootPage.title)),
    rootPage.title,
    rootPageId,
    0
  );
  const total = 1 + result.children;
  console.log(`\nDone. Synced ${total} pages to ${OUTPUT_DIR}`);
} else {
  console.log(`Syncing space ${SPACE_KEY} to ${OUTPUT_DIR}\n`);

  const spaceId = USE_SPACE_ID ? SPACE_KEY : getSpaceId(SPACE_KEY);
  if (!spaceId) {
    console.error(`Space "${SPACE_KEY}" not found`);
    process.exit(1);
  }

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
}
