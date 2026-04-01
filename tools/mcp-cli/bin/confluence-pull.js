#!/usr/bin/env node
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const execAsync = promisify(exec);

/** Limit concurrent `mcp` subprocesses (API-friendly). */
function pLimit(concurrency) {
  const queue = [];
  let active = 0;

  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

function parseArgs(argv) {
  const USE_SPACE_ID = argv.includes("--spaceId");
  const FORCE_FULL = argv.includes("--force");
  let rootPageId = null;
  let concurrency = null;
  const out = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--spaceId" || a === "--force") continue;
    if (a === "--concurrency" || a === "-j") {
      const n = argv[++i];
      if (!n) {
        console.error("Missing value for --concurrency <n>");
        process.exit(1);
      }
      concurrency = Number(n);
      if (!Number.isFinite(concurrency) || concurrency < 1) {
        console.error("--concurrency must be a positive integer");
        process.exit(1);
      }
      continue;
    }
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
  return { USE_SPACE_ID, FORCE_FULL, rootPageId, positional: out, concurrency };
}

const { USE_SPACE_ID, FORCE_FULL, rootPageId, positional, concurrency: concurrencyArg } = parseArgs(
  process.argv.slice(2),
);

const CONCURRENCY = Math.floor(
  concurrencyArg ??
    (process.env.CONFLUENCE_PULL_CONCURRENCY
      ? Number(process.env.CONFLUENCE_PULL_CONCURRENCY)
      : 8),
);

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
  console.error("  --force          Re-download every page (skip incremental checks)");
  console.error("  --concurrency n  Max concurrent MCP calls (default: 8, env: CONFLUENCE_PULL_CONCURRENCY)");
  console.error("");
  console.error("To get your cloudId:");
  console.error("  mcp atlassian getAccessibleAtlassianResources");
  console.error("");
  console.error("To list spaces:");
  console.error("  mcp atlassian getConfluenceSpaces --cloudId <cloudId>");
  process.exit(1);
}

if (!Number.isFinite(CONCURRENCY) || CONCURRENCY < 1) {
  console.error("Concurrency must be a positive integer");
  process.exit(1);
}

const limit = pLimit(CONCURRENCY);

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

async function mcp(toolName, args = {}) {
  return limit(async () => {
    const flags = Object.entries(args).map(([k, v]) => `--${k} ${JSON.stringify(v)}`).join(" ");
    const cmd = `mcp atlassian "${toolName}" ${flags}`;
    try {
      const { stdout } = await execAsync(cmd, {
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
      });
      return stripAnsi(stdout).trim();
    } catch (e) {
      return stripAnsi(e.stdout?.toString().trim()) || '{"error":true,"message":"' + e.message + '"}';
    }
  });
}

function indent(level) {
  return "  ".repeat(level);
}

function sanitize(title) {
  return title.replace(/[\/\\:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/^-+|-+$/g, "").slice(0, 200);
}

function folderBase(page) {
  return sanitize(page.title) || "page";
}

/**
 * One folder name per page under the same parent: use the sanitized title, and add `-<id>`
 * only when another sibling would get the same name (or after truncation).
 */
function folderNamesForSiblings(pages) {
  if (pages.length === 0) return [];
  const bases = pages.map(folderBase);
  const counts = new Map();
  for (const b of bases) {
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return pages.map((p, i) => {
    const base = bases[i];
    if (counts.get(base) === 1) return base;
    return `${base}-${p.id}`;
  });
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

async function getSpaceId(spaceKey) {
  const raw = await mcp("getConfluenceSpaces", { cloudId: CLOUD_ID, keys: spaceKey });
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data.results?.[0]?.id ?? data[0]?.id;
}

async function getPages(spaceId, cursor) {
  const args = { cloudId: CLOUD_ID, spaceId, contentFormat: "markdown", limit: 250 };
  if (cursor) args.cursor = cursor;
  const raw = await mcp("getPagesInConfluenceSpace", args);
  return JSON.parse(raw);
}

async function getPage(pageId) {
  const raw = await mcp("getConfluencePage", { cloudId: CLOUD_ID, pageId, contentFormat: "markdown" });
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data;
}

/** Lightweight title + version number via CQL (no page body). */
async function getPageVersionMeta(pageId) {
  const raw = await mcp("searchConfluenceUsingCql", {
    cloudId: CLOUD_ID,
    cql: `id = ${pageId}`,
    limit: 1,
    expand: "content.version",
  });
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (data.error) return null;
  const content = data.results?.[0]?.content;
  if (!content?.version) return null;
  return {
    title: content.title,
    number: content.version.number,
  };
}

function parseFrontmatterSnapshot(filePath) {
  try {
    const raw = readFileSync(filePath, "utf-8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return null;
    const snap = {};
    for (const line of m[1].split(/\r?\n/)) {
      if (line.startsWith("id:")) snap.id = line.slice(3).trim().replace(/^["']|["']$/g, "");
      else if (line.startsWith("version:")) snap.version = Number(line.slice(8).trim());
    }
    return snap;
  } catch {
    return null;
  }
}

function isUnchangedLocal(filePath, pageId, remoteVersion) {
  if (remoteVersion == null) return false;
  const local = parseFrontmatterSnapshot(filePath);
  if (!local || String(local.id) !== String(pageId)) return false;
  return Number(local.version) === remoteVersion;
}

async function getDescendantsFromApi(pageId) {
  const raw = await mcp("getConfluencePageDescendants", { cloudId: CLOUD_ID, pageId, limit: 250 });
  const data = JSON.parse(raw);
  if (data.error) return [];
  return data.results ?? data ?? [];
}

/** Only immediate children of `pageId` (API may return a flat list of all descendants). */
function getDirectChildren(pageId, results) {
  const pid = String(pageId);
  return results.filter((c) => c && String(c.parentId) === pid);
}

const pullStats = { updated: 0, skipped: 0, visited: 0 };

async function savePage(dir, title, pageId) {
  mkdirSync(dir, { recursive: true });
  const filename = `${sanitize(title)}.md`;
  const filePath = join(dir, filename);
  try {
    if (!FORCE_FULL && existsSync(filePath)) {
      const remote = await getPageVersionMeta(pageId);
      if (remote && isUnchangedLocal(filePath, pageId, remote.number)) {
        pullStats.skipped += 1;
        return { success: true, skipped: true };
      }
    }
    const page = await getPage(pageId);
    const body = page.body ?? page.content ?? "";
    const frontmatter = buildFrontmatter(page);
    const clean = cleanContent(body);
    const output = `${frontmatter}\n\n${clean}\n`;
    writeFileSync(filePath, output, "utf-8");
    pullStats.updated += 1;
    return { success: true, skipped: false };
  } catch (e) {
    const errorPath = join(dir, `${sanitize(title)}.error.txt`);
    writeFileSync(errorPath, e.message, "utf-8");
    return { success: false, skipped: false };
  }
}

async function syncPage(dir, title, pageId, level) {
  pullStats.visited += 1;
  const prefix = indent(level);
  const outcome = await savePage(dir, title, pageId);
  const label = outcome.skipped ? `${title} (unchanged)` : title;
  console.log(`${prefix}├── ${label}`);

  const rawChildren = await getDescendantsFromApi(pageId);
  const children = getDirectChildren(pageId, rawChildren);
  const childFolders = folderNamesForSiblings(children);

  for (let i = 0; i < children.length; i++) {
    mkdirSync(join(dir, childFolders[i]), { recursive: true });
  }

  await Promise.all(
    children.map((child, i) =>
      syncPage(join(dir, childFolders[i]), child.title, child.id, level + 1),
    ),
  );

  return { title, success: outcome.success, children: children.length };
}

async function main() {
  console.log(`Concurrency: ${CONCURRENCY} (mcp calls)\n`);

  if (rootPageId) {
    console.log(`Syncing subtree from page ${rootPageId} to ${OUTPUT_DIR}`);
    if (!FORCE_FULL) console.log("Incremental: skip when local `version` in frontmatter matches Confluence (use --force for full re-download)\n");
    else console.log("");
    let rootTitle;
    const meta = await getPageVersionMeta(rootPageId);
    if (meta?.title) rootTitle = meta.title;
    else {
      const rootPage = await getPage(rootPageId);
      rootTitle = rootPage.title;
    }
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const [rootSeg] = folderNamesForSiblings([{ id: rootPageId, title: rootTitle }]);
    mkdirSync(join(OUTPUT_DIR, rootSeg), { recursive: true });
    await syncPage(join(OUTPUT_DIR, rootSeg), rootTitle, rootPageId, 0);
    console.log(
      `\nDone. ${OUTPUT_DIR} — ${pullStats.visited} pages visited, ${pullStats.updated} updated, ${pullStats.skipped} unchanged (skipped)`,
    );
  } else {
    console.log(`Syncing space ${SPACE_KEY} to ${OUTPUT_DIR}`);
    if (!FORCE_FULL) console.log("Incremental: skip when local `version` in frontmatter matches Confluence (use --force for full re-download)\n");
    else console.log("");

    const spaceId = USE_SPACE_ID ? SPACE_KEY : await getSpaceId(SPACE_KEY);
    if (!spaceId) {
      console.error(`Space "${SPACE_KEY}" not found`);
      process.exit(1);
    }

    const topPages = [];
    let cursor;
    do {
      const data = await getPages(spaceId, cursor);
      if (data.error) throw new Error(data.message);
      const pages = data.results ?? data ?? [];
      topPages.push(...pages);
      cursor = data._links?.next ? "next" : undefined;
    } while (cursor);

    console.log(`Found ${topPages.length} top-level pages\n`);

    mkdirSync(OUTPUT_DIR, { recursive: true });

    const topFolders = folderNamesForSiblings(topPages);
    for (let i = 0; i < topPages.length; i++) {
      mkdirSync(join(OUTPUT_DIR, topFolders[i]), { recursive: true });
    }

    await Promise.all(
      topPages.map((page, i) => syncPage(join(OUTPUT_DIR, topFolders[i]), page.title, page.id, 0)),
    );

    console.log(
      `\nDone. ${OUTPUT_DIR} — ${pullStats.visited} pages visited, ${pullStats.updated} updated, ${pullStats.skipped} unchanged (skipped)`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
