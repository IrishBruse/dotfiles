#!/usr/bin/env node
/**
 * List Jira issues under a root issue (full descendant subtree by default) via MCP Atlassian.
 * Auth: same as mcp-cli — OAuth/keychain or MCP_<server>_TOKEN / --token.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { getOAuthToken } from "./oauth.ts";
import {
  callTool,
  listTools,
  type McpConfig,
  type ServerConfig,
} from "./client.ts";
import { CONFIG_PATH, dim, formatTextContentErrorPlain } from "./commands.ts";

interface ParsedArgs {
  input: string | null;
  cloudId: string | null;
  serverName: string;
  explicitToken: string | null;
  /** Max issues to collect (subtree total or single-query cap). */
  limit: number;
  json: boolean;
  customJql: string | null;
  /** Only direct children of the root (no recursion). */
  childrenOnly: boolean;
}

const PAGE_SIZE = 100;
const IN_CHUNK = 40;
const DEFAULT_SUBTREE_LIMIT = 500;
const MAX_LIMIT = 2000;
/** Safety cap per BFS wave so one epic cannot pull unbounded pages. */
const PER_WAVE_ISSUE_CAP = 5000;

function printUsage(): void {
  const prog = path.basename(process.argv[1] ?? "jira-ls");
  process.stderr.write(`Usage:
  ${prog} <jira-url-or-issue-key> [options]

  Walks the issue hierarchy under the root: each round loads issues whose
  parent or Epic Link is in the current frontier, then expands those issues
  until there are no more descendants (BFS). Default JQL paths are:
 parent in (KEY1, KEY2, …)  and  "Epic Link" in (KEY1, KEY2, …)
  (Epic Link is skipped automatically if your site does not expose that field.)

Options:
  --cloud-id <id>   Atlassian cloud id (hostname like mysite.atlassian.net, or UUID).
                    For a bare issue key, required unless JIRA_CLOUD_ID is set.
  --server <name>   MCP server key in mcp.json (default: atlassian)
  --token <bearer>  Bearer token (else OAuth / MCP_<SERVER>_TOKEN)
  --limit <n>       Max issues to return (default: ${DEFAULT_SUBTREE_LIMIT}, max: ${MAX_LIMIT})
  --children-only   List only direct children (no subtree recursion)
  --jql <query>     Use this JQL instead of subtree / children queries.
                    Placeholder $KEY is replaced with the issue key (quote for shell).
  --json            Print JSON array of rows (key, type, status, summary, assignee, parentKey, depth)

Config: ${CONFIG_PATH}
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  let input: string | null = null;
  let cloudId = process.env.JIRA_CLOUD_ID ?? null;
  let serverName = "atlassian";
  let explicitToken: string | null = null;
  let limit = DEFAULT_SUBTREE_LIMIT;
  let json = false;
  let customJql: string | null = null;
  let childrenOnly = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      printUsage();
      process.exit(0);
    }
    if (a === "--json") {
      json = true;
      continue;
    }
    if (a === "--children-only") {
      childrenOnly = true;
      continue;
    }
    if (a === "--server") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --server");
        process.exit(1);
      }
      serverName = v;
      continue;
    }
    if (a === "--token") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --token");
        process.exit(1);
      }
      explicitToken = v;
      continue;
    }
    if (a === "--cloud-id") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --cloud-id");
        process.exit(1);
      }
      cloudId = v;
      continue;
    }
    if (a === "--limit") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --limit");
        process.exit(1);
      }
      limit = Number(v);
      if (!Number.isFinite(limit) || limit < 1) {
        console.error("--limit must be a positive number");
        process.exit(1);
      }
      limit = Math.min(MAX_LIMIT, Math.floor(limit));
      continue;
    }
    if (a === "--jql") {
      const v = argv[++i];
      if (!v) {
        console.error("Missing value for --jql");
        process.exit(1);
      }
      customJql = v;
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      process.exit(1);
    }
    if (input != null) {
      console.error("Unexpected extra argument (pass a single URL or issue key)");
      process.exit(1);
    }
    input = a;
  }

  return {
    input,
    cloudId,
    serverName,
    explicitToken,
    limit,
    json,
    customJql,
    childrenOnly,
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

/** Jira issue key, e.g. PROJ-123 */
const ISSUE_KEY_RE = /^[A-Z][A-Z0-9]{1,15}-\d+$/i;

function parseJiraInput(
  raw: string,
): { cloudId: string | null; issueKey: string } | null {
  const trimmed = raw.trim();
  if (ISSUE_KEY_RE.test(trimmed)) {
    return { cloudId: null, issueKey: trimmed.toUpperCase() };
  }
  try {
    const u = new URL(trimmed);
    const host = u.hostname;
    const browse = /\/browse\/([A-Z][A-Z0-9]{1,15}-\d+)/i.exec(u.pathname);
    const keyFromPath = browse?.[1];
    const selected = u.searchParams.get("selectedIssue");
    const key = (keyFromPath ?? selected)?.toUpperCase();
    if (!key || !ISSUE_KEY_RE.test(key)) {
      return null;
    }
    return { cloudId: host, issueKey: key };
  } catch {
    return null;
  }
}

interface IssueRow {
  key: string;
  type: string;
  status: string;
  summary: string;
  assignee: string;
  parentKey: string | null;
  depth: number;
}

function fieldName(v: unknown): string {
  if (v && typeof v === "object" && "name" in v) {
    const n = (v as { name?: string }).name;
    if (typeof n === "string") return n;
  }
  return "";
}

function fieldAssignee(v: unknown): string {
  if (v && typeof v === "object") {
    const o = v as { displayName?: string; emailAddress?: string };
    if (typeof o.displayName === "string") return o.displayName;
    if (typeof o.emailAddress === "string") return o.emailAddress;
  }
  return "";
}

function refKey(v: unknown): string | null {
  if (v && typeof v === "object" && v !== null && "key" in v) {
    const k = (v as { key?: string }).key;
    if (typeof k === "string" && ISSUE_KEY_RE.test(k)) return k.toUpperCase();
  }
  return null;
}

/** Parent for hierarchy: Jira parent link, Epic Link, or epic object. */
function parentRef(fields: Record<string, unknown>): string | null {
  const pk = refKey(fields.parent);
  if (pk) return pk;
  const epicLink = fields["Epic Link"];
  const ek = refKey(epicLink);
  if (ek) return ek;
  return refKey(fields.epic);
}

const SEARCH_FIELDS = [
  "summary",
  "status",
  "issuetype",
  "assignee",
  "parent",
  "Epic Link",
  "epic",
] as const;

function rowFromIssueItem(item: unknown, depth: number): IssueRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const key = typeof o.key === "string" ? o.key.toUpperCase() : "";
  const fields = o.fields as Record<string, unknown> | undefined;
  if (!key || !fields) return null;
  return {
    key,
    type: fieldName(fields.issuetype),
    status: fieldName(fields.status),
    summary: typeof fields.summary === "string" ? fields.summary : "",
    assignee: fieldAssignee(fields.assignee),
    parentKey: parentRef(fields),
    depth,
  };
}

function extractPage(
  data: unknown,
): { issues: unknown[]; nextPageToken?: string } {
  if (!data || typeof data !== "object") return { issues: [] };
  const o = data as Record<string, unknown>;
  const issues = Array.isArray(o.issues) ? o.issues : [];
  const nextPageToken =
    typeof o.nextPageToken === "string" ? o.nextPageToken : undefined;
  return { issues, nextPageToken };
}

async function resolveSearchToolName(
  serverConfig: ServerConfig,
  serverName: string,
): Promise<string> {
  const tools = await listTools(serverConfig, serverName);
  const exact = tools.find((t) => t.name === "searchJiraIssuesUsingJql");
  if (exact) return exact.name;
  const loose = tools.find((t) =>
    /searchJiraIssuesUsingJql/i.test(t.name),
  );
  if (loose) return loose.name;
  throw new Error(
    `No Jira JQL search tool on ${serverName} (expected searchJiraIssuesUsingJql). Run: mcp ${serverName} tools`,
  );
}

function parseToolTextBody(result: McpResultLike): string {
  const content = result?.content;
  if (!Array.isArray(content) || !content.length) {
    throw new Error("Empty response from MCP tool.");
  }
  const texts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text != null) {
      const err = formatTextContentErrorPlain(block.text);
      if (err) {
        throw new Error(err);
      }
      texts.push(block.text);
    }
  }
  return texts.join("\n").trim();
}

interface McpResultLike {
  content?: Array<{ type: string; text?: string }>;
}

async function searchJqlAllIssues(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  cloudId: string,
  jql: string,
  maxToCollect: number,
): Promise<unknown[]> {
  const out: unknown[] = [];
  let nextPageToken: string | undefined;

  while (out.length < maxToCollect) {
    const page = Math.min(PAGE_SIZE, maxToCollect - out.length);
    const toolArgs: Record<string, unknown> = {
      cloudId,
      jql,
      maxResults: page,
      fields: [...SEARCH_FIELDS],
    };
    if (nextPageToken) toolArgs.nextPageToken = nextPageToken;

    const result = await callTool(
      serverConfig,
      serverName,
      toolName,
      toolArgs,
    ) as McpResultLike;

    const body = parseToolTextBody(result);
    let data: unknown;
    try {
      data = JSON.parse(body) as unknown;
    } catch {
      throw new Error(`Expected JSON from search; got: ${body.slice(0, 120)}…`);
    }

    const { issues, nextPageToken: next } = extractPage(data);
    out.push(...issues);

    if (!next || issues.length < page) break;
    nextPageToken = next;
  }

  return out;
}

async function searchJqlAllIssuesLenient(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  cloudId: string,
  jql: string,
  maxToCollect: number,
): Promise<unknown[]> {
  try {
    return await searchJqlAllIssues(
      serverConfig,
      serverName,
      toolName,
      cloudId,
      jql,
      maxToCollect,
    );
  } catch {
    return [];
  }
}

function chunkKeys(keys: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < keys.length; i += size) {
    out.push(keys.slice(i, i + size));
  }
  return out;
}

/**
 * All direct descendants (by parent or Epic Link) of frontier keys.
 * Runs JQL for every chunk of keys in the frontier (no skipping mid-wave).
 * Each JQL call is capped separately so later chunks are not starved.
 */
async function fetchChildrenBatch(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  cloudId: string,
  frontierKeys: string[],
  perQueryCap: number,
): Promise<IssueRow[]> {
  if (!frontierKeys.length) return [];

  const byKey = new Map<string, IssueRow>();

  for (const group of chunkKeys(frontierKeys, IN_CHUNK)) {
    const list = group.join(", ");
    const parentJql = `parent in (${list}) ORDER BY key ASC`;
    const parentIssues = await searchJqlAllIssues(
      serverConfig,
      serverName,
      toolName,
      cloudId,
      parentJql,
      perQueryCap,
    );
    for (const item of parentIssues) {
      const fields = (item as { fields?: Record<string, unknown> })?.fields;
      const pk = fields ? parentRef(fields) : null;
      const row = rowFromIssueItem(item, 0);
      if (row) {
        row.parentKey = pk ?? row.parentKey;
        byKey.set(row.key, row);
      }
    }

    const epicJql = `"Epic Link" in (${list}) ORDER BY key ASC`;
    const epicIssues = await searchJqlAllIssuesLenient(
      serverConfig,
      serverName,
      toolName,
      cloudId,
      epicJql,
      perQueryCap,
    );
    for (const item of epicIssues) {
      const fields = (item as { fields?: Record<string, unknown> })?.fields;
      const pk = fields ? parentRef(fields) : null;
      const row = rowFromIssueItem(item, 0);
      if (row && !byKey.has(row.key)) {
        row.parentKey = pk ?? row.parentKey;
        byKey.set(row.key, row);
      }
    }
  }

  return [...byKey.values()];
}

async function collectSubtree(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  cloudId: string,
  rootKey: string,
  limit: number,
): Promise<IssueRow[]> {
  const depthByKey = new Map<string, number>([[rootKey, 0]]);
  const ordered: IssueRow[] = [];
  let frontier: string[] = [rootKey];
  const perQueryCap = Math.min(
    PER_WAVE_ISSUE_CAP,
    Math.max(limit + 500, 1000),
  );

  while (frontier.length && ordered.length < limit) {
    const batch = await fetchChildrenBatch(
      serverConfig,
      serverName,
      toolName,
      cloudId,
      frontier,
      perQueryCap,
    );

    const nextFrontier: string[] = [];
    const listed = new Set(ordered.map((r) => r.key));

    for (const row of batch) {
      if (row.key === rootKey) continue;
      if (listed.has(row.key)) continue;

      const p = row.parentKey;
      const pDepth = p != null ? depthByKey.get(p) : undefined;
      const depth =
        pDepth !== undefined ? pDepth + 1 : (depthByKey.get(rootKey) ?? 0) + 1;
      row.depth = depth;
      depthByKey.set(row.key, depth);

      if (ordered.length >= limit) break;
      ordered.push(row);
      listed.add(row.key);
      nextFrontier.push(row.key);
    }

    frontier = nextFrontier;
  }

  return ordered;
}

function printTable(rows: IssueRow[]): void {
  if (!rows.length) {
    console.log("(no descendant issues)");
    return;
  }
  const indentStep = 2;
  const wKey = Math.max(3, ...rows.map((r) => r.key.length));
  const keyCol =
    wKey + indentStep * Math.max(0, ...rows.map((r) => r.depth - 1));
  const wType = Math.max(4, ...rows.map((r) => r.type.length));
  const wStatus = Math.max(6, ...rows.map((r) => r.status.length));
  const termW = process.stdout.columns ?? 120;
  const fixed = keyCol + wType + wStatus + 7;
  const summaryMax = Math.max(20, termW - fixed - 12);

  for (const r of rows) {
    const ind = " ".repeat(Math.max(0, r.depth - 1) * indentStep);
    const keyCell = (ind + r.key).padEnd(keyCol);
    const sum =
      r.summary.length > summaryMax
        ? `${r.summary.slice(0, summaryMax - 1)}…`
        : r.summary;
    const assign = r.assignee ? `  @ ${r.assignee}` : "";
    console.log(
      `${keyCell}  ${r.type.padEnd(wType)}  ${r.status.padEnd(wStatus)}  ${sum}${assign}`,
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input) {
    printUsage();
    process.exit(2);
  }

  const parsed = parseJiraInput(args.input);
  if (!parsed) {
    console.error(
      "Could not parse Jira URL or issue key (expected .../browse/KEY or KEY-123).",
    );
    process.exit(1);
  }

  const cloudId = args.cloudId ?? parsed.cloudId;
  if (!cloudId) {
    console.error(
      "Missing cloud id: pass --cloud-id <site.atlassian.net> or set JIRA_CLOUD_ID.",
    );
    process.exit(1);
  }

  const config = loadMcpConfig();
  const raw = config.mcpServers?.[args.serverName];
  if (!raw?.url) {
    console.error(
      `Server "${args.serverName}" not found or not HTTP in ${CONFIG_PATH}`,
    );
    process.exit(1);
  }

  const serverConfig = await resolveAuth(raw, args.serverName, args.explicitToken);

  const toolName = await resolveSearchToolName(serverConfig, args.serverName);

  let rows: IssueRow[];

  if (args.customJql) {
    const jql = args.customJql.replace(/\$KEY/g, parsed.issueKey);
    const rawIssues = await searchJqlAllIssues(
      serverConfig,
      args.serverName,
      toolName,
      cloudId,
      jql,
      args.limit,
    );
    rows = [];
    for (const item of rawIssues) {
      const fields = (item as { fields?: Record<string, unknown> })?.fields;
      const pk = fields ? parentRef(fields) : null;
      const row = rowFromIssueItem(item, 1);
      if (row) {
        row.parentKey = pk ?? row.parentKey;
        rows.push(row);
      }
    }
  } else if (args.childrenOnly) {
    const list = parsed.issueKey;
    const jql = `parent = ${list} ORDER BY key ASC`;
    const jqlEpic = `"Epic Link" = ${list} ORDER BY key ASC`;
    const byKey = new Map<string, IssueRow>();

    for (const item of await searchJqlAllIssues(
      serverConfig,
      serverName,
      toolName,
      cloudId,
      jql,
      args.limit,
    )) {
      const row = rowFromIssueItem(item, 1);
      if (row) byKey.set(row.key, row);
    }
    for (const item of await searchJqlAllIssuesLenient(
      serverConfig,
      serverName,
      toolName,
      cloudId,
      jqlEpic,
      args.limit - byKey.size,
    )) {
      const row = rowFromIssueItem(item, 1);
      if (row && !byKey.has(row.key)) byKey.set(row.key, row);
    }
    rows = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));
  } else {
    rows = await collectSubtree(
      serverConfig,
      args.serverName,
      toolName,
      cloudId,
      parsed.issueKey,
      args.limit,
    );
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        rows.map((r) => ({
          key: r.key,
          type: r.type,
          status: r.status,
          summary: r.summary,
          assignee: r.assignee,
          parentKey: r.parentKey,
          depth: r.depth,
        })),
        null,
        2,
      ),
    );
    return;
  }

  printTable(rows);
}

main().catch((e) => {
  console.error((e as Error).message ?? e);
  process.exit(1);
});
