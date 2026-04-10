#!/usr/bin/env node
const { exec } = require("node:child_process");
const { promisify } = require("node:util");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const execAsync = promisify(exec);

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
  let rootPageId = null;
  let outputDir = null;
  let cloudId = process.env.CONFLUENCE_CLOUD_ID || null;
  let concurrency = null;
  const FORCE_FULL = argv.includes("--force");
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") continue;
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
    if (a === "--cloud-id") {
      cloudId = argv[++i];
      if (!cloudId) {
        console.error("Missing value for --cloud-id <cloudId>");
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
        console.error(
          "Could not find page id in URL (expected .../pages/<id>/...)",
        );
        process.exit(1);
      }
      rootPageId = m[1];
      continue;
    }
    if (a === "--out" || a === "-o") {
      outputDir = argv[++i];
      if (!outputDir) {
        console.error("Missing value for --out <dir>");
        process.exit(1);
      }
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
    if (outputDir == null) outputDir = a;
    else {
      console.error("Unexpected extra argument (use --out <dir> for output)");
      process.exit(1);
    }
  }
  return { FORCE_FULL, rootPageId, outputDir, cloudId, concurrency };
}

const {
  FORCE_FULL,
  rootPageId,
  outputDir: outArg,
  cloudId: cloudArg,
  concurrency: concurrencyArg,
} = parseArgs(process.argv.slice(2));

const CLOUD_ID = cloudArg;
const OUTPUT_DIR = outArg ?? `./confluence-${rootPageId}`;
const CONCURRENCY = Math.floor(
  concurrencyArg ??
    (process.env.CONFLUENCE_PULL_CONCURRENCY
      ? Number(process.env.CONFLUENCE_PULL_CONCURRENCY)
      : 8),
);

if (!rootPageId) {
  console.error(
    "Usage: node confluence-pull.js --url <confluencePageUrl> [--out <dir>] [outputDir]",
  );
  console.error("");
  console.error(
    "  --out, -o <dir>   Output directory (default: ./confluence-<pageId>)",
  );
  console.error("  You can pass <outputDir> as a positional instead of --out.");
  console.error("");
  console.error(
    "  --cloud-id <id>   Atlassian cloud id (or set CONFLUENCE_CLOUD_ID)",
  );
  console.error("  --force           Re-download every page");
  console.error("  -j, --concurrency Max concurrent MCP calls (default: 8)");
  console.error("");
  console.error("Cloud id: mcp atlassian getAccessibleAtlassianResources");
  process.exit(1);
}

if (!CLOUD_ID) {
  console.error(
    "Missing cloud id: pass --cloud-id <id> or set CONFLUENCE_CLOUD_ID",
  );
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
    const flags = Object.entries(args)
      .map(([k, v]) => `--${k} ${JSON.stringify(v)}`)
      .join(" ");
    const cmd = `mcp atlassian "${toolName}" ${flags}`;
    try {
      const { stdout } = await execAsync(cmd, {
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024,
      });
      return stripAnsi(stdout).trim();
    } catch (e) {
      return (
        stripAnsi(e.stdout?.toString().trim()) ||
        '{"error":true,"message":"' + e.message + '"}'
      );
    }
  });
}

function sanitize(title) {
  return title
    .replace(/[\/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function folderBase(page) {
  return sanitize(page.title) || "page";
}

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
  if (
    /[\n:"'{}\[\],&*!|>%@`#]/.test(str) ||
    str === "" ||
    str === "true" ||
    str === "false" ||
    str === "null" ||
    /^\d/.test(str)
  ) {
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
  text = text.replace(
    /<custom data-type="emoji"[^>]*>(:?\w+)<\/custom>/g,
    "$1",
  );
  text = text.replace(
    /<custom data-type="mention"[^>]*>(@?\w+)<\/custom>/g,
    "$1",
  );
  text = text.replace(/<custom data-type="date"[^>]*>([^<]*)<\/custom>/g, "$1");
  text = text.replace(
    /<custom data-type="placeholder"[^>]*>.*?<\/custom>/g,
    "",
  );
  text = text.replace(/<custom[^>]*>.*?<\/custom>/g, "");
  text = text.replace(/!\[\]\(blob:[^)]*\)/g, "");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

async function getPage(pageId) {
  const raw = await mcp("getConfluencePage", {
    cloudId: CLOUD_ID,
    pageId,
    contentFormat: "markdown",
  });
  const data = JSON.parse(raw);
  if (data.error) throw new Error(data.message);
  return data;
}

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
      if (line.startsWith("id:"))
        snap.id = line
          .slice(3)
          .trim()
          .replace(/^["']|["']$/g, "");
      else if (line.startsWith("version:"))
        snap.version = Number(line.slice(8).trim());
      else if (line.startsWith("status:"))
        snap.status = line
          .slice(7)
          .trim()
          .replace(/^["']|["']$/g, "");
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
  const raw = await mcp("getConfluencePageDescendants", {
    cloudId: CLOUD_ID,
    pageId,
    limit: 250,
  });
  const data = JSON.parse(raw);
  if (data.error) return [];
  return data.results ?? data ?? [];
}

function getDirectChildren(pageId, results) {
  const pid = String(pageId);
  return results.filter((c) => c && String(c.parentId) === pid);
}

const pullStats = { updated: 0, skipped: 0, visited: 0, failed: 0, missing: 0 };

/** Stable display / filename base when Confluence returns an empty title */
function safePageTitle(title, pageId) {
  const t = title != null ? String(title).trim() : "";
  return t || `page-${pageId}`;
}

/** Avoid `.md` / `.error.txt` when sanitize() strips everything (e.g. odd titles). */
function markdownBasename(title, pageId) {
  const s = sanitize(safePageTitle(title, pageId));
  return s || `page-${pageId}`;
}

function isNotFoundError(message) {
  const m = String(message ?? "");
  if (/NOT_FOUND/i.test(m)) return true;
  return /\b404\b/.test(m) && /not\s*found/i.test(m);
}

function buildMissingPageDoc(pageId, title) {
  const display = safePageTitle(title, pageId);
  const lines = [
    "---",
    `id: ${yamlEscape(String(pageId))}`,
    `title: ${yamlEscape(display)}`,
    `status: ${yamlEscape("missing")}`,
    `syncNote: ${yamlEscape(
      "Confluence returned 404 when fetching this page; it may have been deleted, moved, or access was denied.",
    )}`,
    "---",
    "",
    "# Page unavailable",
    "",
    "This page was listed under its parent in Confluence but **could not be retrieved** (HTTP 404). It may have been removed or renamed. Confirm the page in Confluence and re-run sync if needed.",
    "",
  ];
  return lines.join("\n");
}

function sortChildrenStable(children) {
  return [...children].sort((a, b) => {
    const ta = safePageTitle(a.title, a.id).toLocaleLowerCase();
    const tb = safePageTitle(b.title, b.id).toLocaleLowerCase();
    const c = ta.localeCompare(tb, undefined, { sensitivity: "base" });
    if (c !== 0) return c;
    return String(a.id).localeCompare(String(b.id));
  });
}

async function savePage(dir, title, pageId, fileBaseOverride = null) {
  mkdirSync(dir, { recursive: true });
  const base = fileBaseOverride ?? markdownBasename(title, pageId);
  const filePath = join(dir, `${base}.md`);
  try {
    if (!FORCE_FULL && existsSync(filePath)) {
      const snap = parseFrontmatterSnapshot(filePath);
      if (snap?.status === "missing") {
        pullStats.skipped += 1;
        return { success: true, skipped: true, missing: true };
      }
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
    if (isNotFoundError(e.message)) {
      const stub = buildMissingPageDoc(pageId, title);
      writeFileSync(filePath, stub, "utf-8");
      pullStats.missing += 1;
      return { success: true, skipped: false, missing: true };
    }
    pullStats.failed += 1;
    const errorPath = join(dir, `${markdownBasename(title, pageId)}.error.txt`);
    writeFileSync(errorPath, e.message, "utf-8");
    return { success: false, skipped: false };
  }
}

/**
 * Depth-first sync with sequential children so the tree log is readable (no interleaved lines).
 * @param {string} treePrefix - vertical continuation for ancestors (│ or spaces)
 * @param {boolean} isLastSibling - whether this node is the last child of its parent (for └── vs ├──)
 * @param {boolean} isRoot - root row prints title only (no tree connector)
 * @param {string | null} leafSlug - when this page is a leaf under its parent, basename for `.md` (sibling-disambiguated); omit for branch nodes and root
 * @param {unknown} preloadedRaw - if set (including `[]`), use as descendant list instead of calling the API (avoids duplicate fetches; `[]` for known leaves)
 */
async function syncPage(
  dir,
  title,
  pageId,
  treePrefix,
  isLastSibling,
  isRoot,
  leafSlug = null,
  preloadedRaw = undefined,
) {
  pullStats.visited += 1;
  const rawChildren =
    preloadedRaw !== undefined
      ? preloadedRaw
      : await getDescendantsFromApi(pageId);
  const children = sortChildrenStable(getDirectChildren(pageId, rawChildren));
  const childFolders = folderNamesForSiblings(children);

  const fileBaseOverride = isRoot || children.length > 0 ? null : leafSlug;
  const outcome = await savePage(dir, title, pageId, fileBaseOverride);

  const displayTitle = safePageTitle(title, pageId);
  let label = displayTitle;
  if (outcome.skipped) label = `${displayTitle} (unchanged)`;
  else if (outcome.missing) label = `${displayTitle} (Confluence 404 — stub)`;
  if (isRoot) {
    console.log(label);
  } else {
    const connector = isLastSibling ? "└── " : "├── ";
    console.log(`${treePrefix}${connector}${label}`);
  }

  const childTreePrefix = isRoot
    ? ""
    : treePrefix + (isLastSibling ? "    " : "│   ");

  for (let i = 0; i < children.length; i++) {
    const ch = children[i];
    const seg = childFolders[i];
    const chSub = await getDescendantsFromApi(ch.id);
    const chKids = sortChildrenStable(getDirectChildren(ch.id, chSub));
    if (chKids.length === 0) {
      await syncPage(
        dir,
        ch.title,
        ch.id,
        childTreePrefix,
        i === children.length - 1,
        false,
        seg,
        [],
      );
    } else {
      const childDir = join(dir, seg);
      mkdirSync(childDir, { recursive: true });
      await syncPage(
        childDir,
        ch.title,
        ch.id,
        childTreePrefix,
        i === children.length - 1,
        false,
        null,
        chSub,
      );
    }
  }

  return { title, success: outcome.success, children: children.length };
}

async function main() {
  console.log(`Concurrency: ${CONCURRENCY} (mcp calls)\n`);
  console.log(`Syncing subtree from page ${rootPageId} to ${OUTPUT_DIR}`);
  if (!FORCE_FULL)
    console.log(
      "Incremental: skip when local `version` in frontmatter matches Confluence (use --force for full re-download)\n",
    );
  else console.log("");

  let rootTitle;
  const meta = await getPageVersionMeta(rootPageId);
  if (meta?.title) rootTitle = meta.title;
  else {
    const rootPage = await getPage(rootPageId);
    rootTitle = rootPage.title;
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const [rootSeg] = folderNamesForSiblings([
    { id: rootPageId, title: rootTitle },
  ]);
  mkdirSync(join(OUTPUT_DIR, rootSeg), { recursive: true });
  await syncPage(
    join(OUTPUT_DIR, rootSeg),
    rootTitle,
    rootPageId,
    "",
    false,
    true,
    null,
    undefined,
  );
  const { visited, updated, skipped, failed, missing } = pullStats;
  const parts = [
    `${visited} visited`,
    `${updated} updated`,
    `${skipped} unchanged (skipped)`,
  ];
  if (missing > 0) parts.push(`${missing} missing (404 stub)`);
  if (failed > 0) parts.push(`${failed} failed (see *.error.txt)`);
  console.log(`\nDone. ${OUTPUT_DIR} — ${parts.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
