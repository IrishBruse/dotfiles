#!/usr/bin/env node
/**
 * Confluence subtree → markdown via MCP HTTP (Atlassian tools).
 * Auth: same as mcp-cli — OAuth/keychain or MCP_<server>_TOKEN / --token.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { getOAuthToken } from "./oauth.ts";
import { callTool, type McpConfig, type ServerConfig } from "./client.ts";
import { CONFIG_PATH, dim, formatTextContentErrorPlain } from "./commands.ts";

function pLimit(concurrency: number) {
  const queue: Array<{
    fn: () => Promise<unknown>;
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
  }> = [];
  let active = 0;
  const next = () => {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift()!;
    Promise.resolve()
      .then(fn)
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  };
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      queue.push({
        fn,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      next();
    });
  };
}

interface ParsedArgs {
  FORCE_FULL: boolean;
  rootPageId: string | null;
  outputDir: string | null;
  cloudId: string | null;
  concurrency: number | null;
  serverName: string;
  explicitToken: string | null;
  authOnly: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  let rootPageId: string | null = null;
  let outputDir: string | null = null;
  let cloudId = process.env.CONFLUENCE_CLOUD_ID ?? null;
  let concurrency: number | null = null;
  let serverName = "atlassian";
  let explicitToken: string | null = null;
  let authOnly = false;
  const FORCE_FULL = argv.includes("--force");
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--force") continue;
    if (a === "--auth") {
      authOnly = true;
      continue;
    }
    if (a === "--server") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --server <name>");
        process.exit(1);
      }
      serverName = v;
      continue;
    }
    if (a === "--token") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --token (Bearer access token)");
        process.exit(1);
      }
      explicitToken = v;
      continue;
    }
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
      cloudId = argv[++i] ?? null;
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
      outputDir = argv[++i] ?? null;
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
  return {
    FORCE_FULL,
    rootPageId,
    outputDir,
    cloudId,
    concurrency,
    serverName,
    explicitToken,
    authOnly,
  };
}

function loadMcpConfig(): McpConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as McpConfig;
  } catch (e) {
    console.error(
      `Failed to read ${CONFIG_PATH}: ${(e as Error).message}`,
    );
    process.exit(1);
  }
}

async function resolveAuth(
  rawServerConfig: ServerConfig,
  serverName: string,
  explicitToken: string | null,
  opts: { forceRefresh?: boolean } = {},
): Promise<ServerConfig> {
  const envKey = `MCP_${serverName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_TOKEN`;
  const staticToken = explicitToken ?? process.env[envKey] ?? null;

  if (staticToken) {
    return {
      ...rawServerConfig,
      headers: {
        ...rawServerConfig.headers,
        Authorization: `Bearer ${staticToken}`,
      },
    };
  }

  if (!opts.forceRefresh && rawServerConfig.headers?.Authorization) {
    return rawServerConfig;
  }

  const token = await getOAuthToken(
    rawServerConfig as { url: string },
    serverName,
    (msg) => process.stderr.write(dim(msg)),
    opts,
  );
  return {
    ...rawServerConfig,
    headers: { ...rawServerConfig.headers, Authorization: `Bearer ${token}` },
  };
}

const parsed = parseArgs(process.argv.slice(2));

async function runAuthOnly(): Promise<void> {
  const config = loadMcpConfig();
  const raw = config.mcpServers?.[parsed.serverName];
  if (!raw?.url) {
    console.error(
      `Server "${parsed.serverName}" not found or not HTTP in ${CONFIG_PATH}`,
    );
    process.exit(1);
  }
  await getOAuthToken(
    { url: raw.url },
    parsed.serverName,
    (m) => process.stderr.write(dim(m)),
    { forceRefresh: true },
  );
}

const {
  FORCE_FULL,
  rootPageId,
  outputDir: outArg,
  cloudId: cloudArg,
  concurrency: concurrencyArg,
  serverName: MCP_SERVER_NAME,
  explicitToken: MCP_EXPLICIT_TOKEN,
} = parsed;

const CLOUD_ID = cloudArg;
const OUTPUT_DIR = outArg ?? (rootPageId ? `./confluence-${rootPageId}` : "");
const CONCURRENCY = Math.floor(
  concurrencyArg ??
    (process.env.CONFLUENCE_PULL_CONCURRENCY
      ? Number(process.env.CONFLUENCE_PULL_CONCURRENCY)
      : 8),
);

let resolvedMcpConfig: ServerConfig;

const limit = pLimit(
  !rootPageId || !CLOUD_ID || !Number.isFinite(CONCURRENCY) || CONCURRENCY < 1
    ? 8
    : CONCURRENCY,
);

async function mcp(toolName: string, args: Record<string, unknown> = {}) {
  return limit(async () => {
    try {
      const result = await callTool(
        resolvedMcpConfig,
        MCP_SERVER_NAME,
        toolName,
        args,
      );
      const content = result?.content;
      if (!Array.isArray(content) || !content.length) {
        return JSON.stringify(result ?? { error: true, message: "empty result" });
      }
      const parts: string[] = [];
      for (const block of content) {
        if (block.type === "text" && block.text != null) {
          const err = formatTextContentErrorPlain(block.text);
          if (err) throw new Error(err);
          parts.push(block.text);
        }
      }
      return parts.join("\n").trim();
    } catch (e) {
      return (
        '{"error":true,"message":' +
        JSON.stringify((e as Error).message ?? String(e)) +
        "}"
      );
    }
  });
}

function sanitize(title: string) {
  return title
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

interface PageRef {
  id: string | number;
  title?: string;
  parentId?: string | number;
}

interface ConfluencePage extends PageRef {
  body?: string;
  content?: string;
  type?: string;
  status?: string;
  spaceId?: string | number;
  createdAt?: string;
  version?: { number?: number };
}

function folderBase(page: PageRef) {
  return sanitize(page.title ?? "") || "page";
}

function folderNamesForSiblings(pages: PageRef[]) {
  if (pages.length === 0) return [];
  const bases = pages.map(folderBase);
  const counts = new Map<string, number>();
  for (const b of bases) {
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  return pages.map((p, i) => {
    const base = bases[i];
    if (counts.get(base) === 1) return base;
    return `${base}-${p.id}`;
  });
}

function yamlEscape(val: unknown) {
  if (val == null) return "null";
  const str = String(val);
  if (
    /[\n:"'{}[\],&*!|>%@`#]/.test(str) ||
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

function buildFrontmatter(page: ConfluencePage) {
  const lines = ["---"];
  const fields: [string, unknown][] = [
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

function cleanContent(body: string) {
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

async function getPage(pageId: string) {
  const raw = await mcp("getConfluencePage", {
    cloudId: CLOUD_ID,
    pageId,
    contentFormat: "markdown",
  });
  const data = JSON.parse(raw) as { error?: boolean; message?: string } & ConfluencePage;
  if (data.error) throw new Error(String(data.message ?? "MCP error"));
  return data;
}

async function getPageVersionMeta(pageId: string) {
  const raw = await mcp("searchConfluenceUsingCql", {
    cloudId: CLOUD_ID,
    cql: `id = ${pageId}`,
    limit: 1,
    expand: "content.version",
  });
  let data: {
    error?: boolean;
    results?: Array<{ content?: { title?: string; version?: { number?: number } } }>;
  };
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

interface FrontmatterSnapshot {
  id?: string;
  version?: number;
  status?: string;
}

function parseFrontmatterSnapshot(filePath: string): FrontmatterSnapshot | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) return null;
    const snap: FrontmatterSnapshot = {};
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

function isUnchangedLocal(
  filePath: string,
  pageId: string,
  remoteVersion: number | undefined,
) {
  if (remoteVersion == null) return false;
  const local = parseFrontmatterSnapshot(filePath);
  if (!local || String(local.id) !== String(pageId)) return false;
  return Number(local.version) === remoteVersion;
}

interface Descendant {
  id: string | number;
  title?: string;
  parentId?: string | number;
}

async function getDescendantsFromApi(pageId: string): Promise<Descendant[]> {
  const raw = await mcp("getConfluencePageDescendants", {
    cloudId: CLOUD_ID,
    pageId,
    limit: 250,
  });
  const data = JSON.parse(raw) as {
    error?: boolean;
    results?: Descendant[];
  };
  if (data.error) return [];
  return data.results ?? (data as unknown as Descendant[]) ?? [];
}

function getDirectChildren(pageId: string, results: Descendant[]) {
  const pid = String(pageId);
  return results.filter((c) => c && String(c.parentId) === pid);
}

const pullStats = {
  updated: 0,
  skipped: 0,
  visited: 0,
  failed: 0,
  missing: 0,
};

function safePageTitle(title: string | undefined, pageId: string) {
  const t = title != null ? String(title).trim() : "";
  return t || `page-${pageId}`;
}

function markdownBasename(title: string | undefined, pageId: string) {
  const s = sanitize(safePageTitle(title, pageId));
  return s || `page-${pageId}`;
}

function isNotFoundError(message: string | undefined) {
  const m = String(message ?? "");
  if (/NOT_FOUND/i.test(m)) return true;
  return /\b404\b/.test(m) && /not\s*found/i.test(m);
}

function buildMissingPageDoc(pageId: string, title: string | undefined) {
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

function sortChildrenStable(children: Descendant[]) {
  return [...children].sort((a, b) => {
    const ta = safePageTitle(a.title, String(a.id)).toLocaleLowerCase();
    const tb = safePageTitle(b.title, String(b.id)).toLocaleLowerCase();
    const c = ta.localeCompare(tb, undefined, { sensitivity: "base" });
    if (c !== 0) return c;
    return String(a.id).localeCompare(String(b.id));
  });
}

async function savePage(
  dir: string,
  title: string | undefined,
  pageId: string,
  fileBaseOverride: string | null = null,
) {
  fs.mkdirSync(dir, { recursive: true });
  const base = fileBaseOverride ?? markdownBasename(title, pageId);
  const filePath = path.join(dir, `${base}.md`);
  try {
    if (!FORCE_FULL && fs.existsSync(filePath)) {
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
    fs.writeFileSync(filePath, output, "utf-8");
    pullStats.updated += 1;
    return { success: true, skipped: false };
  } catch (e) {
    if (isNotFoundError((e as Error).message)) {
      const stub = buildMissingPageDoc(pageId, title);
      fs.writeFileSync(filePath, stub, "utf-8");
      pullStats.missing += 1;
      return { success: true, skipped: false, missing: true };
    }
    pullStats.failed += 1;
    const errorPath = path.join(
      dir,
      `${markdownBasename(title, pageId)}.error.txt`,
    );
    fs.writeFileSync(errorPath, (e as Error).message, "utf-8");
    return { success: false, skipped: false };
  }
}

async function syncPage(
  dir: string,
  title: string | undefined,
  pageId: string,
  treePrefix: string,
  isLastSibling: boolean,
  isRoot: boolean,
  leafSlug: string | null = null,
  preloadedRaw: Descendant[] | undefined = undefined,
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
    const chSub = await getDescendantsFromApi(String(ch.id));
    const chKids = sortChildrenStable(getDirectChildren(String(ch.id), chSub));
    if (chKids.length === 0) {
      await syncPage(
        dir,
        ch.title,
        String(ch.id),
        childTreePrefix,
        i === children.length - 1,
        false,
        seg,
        [],
      );
    } else {
      const childDir = path.join(dir, seg);
      fs.mkdirSync(childDir, { recursive: true });
      await syncPage(
        childDir,
        ch.title,
        String(ch.id),
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

async function mainPull(): Promise<void> {
  if (!rootPageId) {
    const prog = path.basename(process.argv[1] ?? "confluence-pull");
    console.error(
      `Usage: ${prog} --url <confluencePageUrl> [--out <dir>] [outputDir]`,
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
    console.error(
      "  -j, --concurrency Max concurrent MCP tool calls (default: 8)",
    );
    console.error(
      "  --server <name>   MCP server key in mcp.json (default: atlassian)",
    );
    console.error(
      "  --token <jwt>     Bearer token (optional; else OAuth / env MCP_<SERVER>_TOKEN)",
    );
    console.error(
      "  --auth            Run OAuth only (same store as mcp-cli); opens browser",
    );
    console.error("");
    console.error(`Reads MCP config: ${CONFIG_PATH}`);
    console.error("Cloud id: use mcp list / Atlassian resources, or site URL.");
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

  const mcpConfig = loadMcpConfig();
  const rawMcpServer = mcpConfig.mcpServers?.[MCP_SERVER_NAME];
  if (!rawMcpServer?.url) {
    console.error(
      `MCP server "${MCP_SERVER_NAME}" missing or not HTTP. Check ${CONFIG_PATH}`,
    );
    process.exit(1);
  }

  resolvedMcpConfig = await resolveAuth(
    rawMcpServer,
    MCP_SERVER_NAME,
    MCP_EXPLICIT_TOKEN,
  );

  console.log(`Concurrency: ${CONCURRENCY} (MCP tools/call)\n`);
  console.log(`Syncing subtree from page ${rootPageId} to ${OUTPUT_DIR}`);
  if (!FORCE_FULL)
    console.log(
      "Incremental: skip when local `version` in frontmatter matches Confluence (use --force for full re-download)\n",
    );
  else console.log("");

  let rootTitle: string | undefined;
  const meta = await getPageVersionMeta(rootPageId);
  if (meta?.title) rootTitle = meta.title;
  else {
    const rootPage = await getPage(rootPageId);
    rootTitle = rootPage.title;
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const [rootSeg] = folderNamesForSiblings([
    { id: rootPageId, title: rootTitle },
  ]);
  fs.mkdirSync(path.join(OUTPUT_DIR, rootSeg), { recursive: true });
  await syncPage(
    path.join(OUTPUT_DIR, rootSeg),
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

async function entry(): Promise<void> {
  if (parsed.authOnly) {
    await runAuthOnly();
    return;
  }
  await mainPull();
}

entry().catch((e) => {
  console.error(e);
  process.exit(1);
});
