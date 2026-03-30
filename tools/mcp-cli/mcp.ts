#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { TOKENS_PATH, loadTokens, saveTokens, getOAuthToken } from "./oauth.ts";

const CONFIG_PATH = path.join(os.homedir(), ".config", "mcp-cli", "mcp.json");

// --- Types ---

interface ServerConfig {
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}

interface McpConfig {
  mcpServers?: Record<string, ServerConfig>;
}

interface McpResult {
  result?: unknown;
  error?: unknown;
  content?: Array<{ type: string; text?: string }>;
}

// --- Colors ---

const RESET = "\u001b[0m";
const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";
const C_CYAN = "\u001b[36m";
const C_GREEN = "\u001b[32m";
const C_YELLOW = "\u001b[33m";
const C_RED = "\u001b[31m";

function useColor(): boolean {
  return !process.env.NO_COLOR?.trim() && Boolean(process.stdout.isTTY);
}

const label = (s: string) => (useColor() ? `${C_CYAN}${BOLD}${s}${RESET}` : s);
const value = (s: string) => (useColor() ? `${C_GREEN}${s}${RESET}` : s);
const highlight = (s: string) =>
  useColor() ? `${C_YELLOW}${BOLD}${s}${RESET}` : s;
const dim = (s: string) => (useColor() ? `${DIM}${s}${RESET}` : s);
const errStyle = (s: string) => (useColor() ? `${C_RED}${s}${RESET}` : s);

function printJson(data: unknown): void {
  const input = typeof data === "string" ? data : JSON.stringify(data);
  const jqCmd = useColor() ? "jq -C ." : "jq .";
  try {
    const result = execSync(jqCmd, {
      input,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    console.log(result.trimEnd());
  } catch {
    console.log(JSON.stringify(data, null, 2));
  }
}

// --- Config ---

function loadConfig(): McpConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as McpConfig;
  } catch (e) {
    console.error(
      errStyle(`Failed to read ${CONFIG_PATH}: ${(e as Error).message}`),
    );
    process.exit(1);
  }
}

// --- Auth ---

async function resolveAuth(
  serverConfig: ServerConfig,
  serverName: string,
  explicitToken: string | null,
  opts: { forceRefresh?: boolean } = {},
): Promise<ServerConfig> {
  const envKey = `MCP_${serverName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_TOKEN`;
  const staticToken = explicitToken ?? process.env[envKey] ?? null;

  if (staticToken) {
    return {
      ...serverConfig,
      headers: {
        ...serverConfig.headers,
        Authorization: `Bearer ${staticToken}`,
      },
    };
  }

  if (!opts.forceRefresh && serverConfig.headers?.Authorization) {
    return serverConfig;
  }

  const token = await getOAuthToken(
    serverConfig as { url: string },
    serverName,
    (msg) => process.stderr.write(dim(msg)),
    opts,
  );
  return {
    ...serverConfig,
    headers: { ...serverConfig.headers, Authorization: `Bearer ${token}` },
  };
}

// --- MCP JSON-RPC ---

// Streamable HTTP transport requires the session ID returned by `initialize`
// to be echoed back on every subsequent request via `Mcp-Session-Id`.
interface McpSession {
  config: ServerConfig;
  sessionId: string | null;
}

function createSession(config: ServerConfig): McpSession {
  return { config, sessionId: null };
}

let _reqId = 1;

// --- Cache ---

interface CacheEntry {
  session: McpSession;
  tools: Array<{ name: string; description?: string }>;
  expires: number;
}

const _cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedSession(config: ServerConfig, serverName: string): McpSession {
  const cached = _cache.get(serverName);
  if (cached && cached.expires > Date.now()) {
    cached.session.config = config;
    cached.expires = Date.now() + CACHE_TTL;
    return cached.session;
  }
  const session = createSession(config);
  _cache.set(serverName, { session, tools: [], expires: Date.now() + CACHE_TTL });
  return session;
}

function getCachedTools(serverName: string): Array<{ name: string; description?: string }> | null {
  const cached = _cache.get(serverName);
  if (cached && cached.tools.length && cached.expires > Date.now()) {
    return cached.tools;
  }
  return null;
}

function setCachedTools(serverName: string, tools: Array<{ name: string; description?: string }>): void {
  const cached = _cache.get(serverName);
  if (cached) {
    cached.tools = tools;
    cached.expires = Date.now() + CACHE_TTL;
  }
}

async function mcpPost(
  session: McpSession,
  method: string,
  params: Record<string, unknown> = {},
): Promise<McpResult> {
  const { url, headers: extraHeaders = {} } = session.config;
  const id = _reqId++;
  const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...extraHeaders,
  };
  if (session.sessionId) reqHeaders["Mcp-Session-Id"] = session.sessionId;

  const res = await fetch(url!, { method: "POST", headers: reqHeaders, body });

  const newSessionId = res.headers.get("mcp-session-id");
  if (newSessionId) session.sessionId = newSessionId;

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    return extractFromSSE(await res.text(), id);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }

  const text = await res.text();
  try {
    return JSON.parse(text) as McpResult;
  } catch (e) {
    throw new Error(`Failed to parse JSON response: ${text.slice(0, 200)}`);
  }
}

function extractFromSSE(text: string, targetId: number): McpResult {
  const messages: McpResult[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice("data:".length).trim();
    if (!data || data === "[DONE]") continue;
    try {
      messages.push(JSON.parse(data) as McpResult);
    } catch {}
  }
  return (
    messages.find((m) => (m as Record<string, unknown>).id === targetId) ??
    messages.at(-1) ??
    {}
  );
}

async function initialize(session: McpSession): Promise<unknown> {
  const res = await mcpPost(session, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mcp-cli", version: "1.0.0" },
  });
  if (res?.error) throw new Error(`initialize: ${JSON.stringify(res.error)}`);
  return (res as Record<string, unknown>).result ?? res;
}

async function listTools(
  serverConfig: ServerConfig,
  serverName: string,
): Promise<Array<{ name: string; description?: string }>> {
  const cached = getCachedTools(serverName);
  if (cached) return cached;

  const session = getCachedSession(serverConfig, serverName);
  await initialize(session);
  const res = await mcpPost(session, "tools/list", {});
  if (res?.error) throw new Error(`tools/list: ${JSON.stringify(res.error)}`);
  const r = res as Record<string, unknown>;
  const tools = (
    (((r.result as Record<string, unknown>)?.tools ?? r.tools) as Array<{
      name: string;
      description?: string;
    }>) ?? []
  );
  setCachedTools(serverName, tools);
  return tools;
}

async function callTool(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
): Promise<McpResult> {
  const session = getCachedSession(serverConfig, serverName);
  await initialize(session);
  const res = await mcpPost(session, "tools/call", {
    name: toolName,
    arguments: toolArgs,
  });
  if (res?.error) throw new Error(`tools/call: ${JSON.stringify(res.error)}`);
  return ((res as Record<string, unknown>).result as McpResult) ?? res;
}

// --- Commands ---

function cmdList(config: McpConfig): void {
  const servers = config.mcpServers ?? {};
  const entries = Object.entries(servers);
  if (!entries.length) {
    console.log("No MCP servers configured.");
    return;
  }
  const tokens = loadTokens();
  console.log(
    `${label(`MCP Servers (${entries.length})`)}  ${dim(CONFIG_PATH)}`,
  );
  console.log();
  for (const [n, cfg] of entries) {
    const transport = cfg.url ? "http" : cfg.command ? "stdio" : "unknown";
    const loc =
      cfg.url ??
      (cfg.command ? [cfg.command, ...(cfg.args ?? [])].join(" ") : "?");
    const hasStaticAuth = Boolean(cfg.headers?.Authorization);
    const hasStoredToken = Boolean(tokens[n]?.access_token);
    const authNote = hasStaticAuth
      ? dim(" [token]")
      : hasStoredToken
        ? dim(" [oauth]")
        : "";
    console.log(
      `  ${highlight(n)}  ${dim(transport)}  ${value(loc)}${authNote}`,
    );
  }
}

async function cmdTools(
  serverConfig: ServerConfig,
  serverName: string,
): Promise<void> {
  const tools = await listTools(serverConfig, serverName);

  if (!tools.length) {
    console.log("No tools available.");
    return;
  }

  console.log(`${label(`Tools (${tools.length})`)}\n`);
  for (const tool of tools) {
    console.log(`  ${highlight(tool.name)}`);
    if (tool.description) {
      const desc = tool.description.replace(/\s+/g, " ").trim();
      const short = desc.length > 120 ? `${desc.slice(0, 117)}…` : desc;
      console.log(`    ${dim(short)}`);
    }
  }
}

async function cmdToolHelp(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
): Promise<void> {
  const tools = await listTools(serverConfig, serverName);
  const tool = tools.find((t) => t.name === toolName) as
    | {
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
      }
    | undefined;

  if (!tool) {
    console.error(errStyle(`Tool "${toolName}" not found on ${serverName}.`));
    process.exit(1);
  }

  const schema = tool.inputSchema;
  const props = schema?.properties as
    | Record<string, Record<string, unknown>>
    | undefined;
  const required = new Set((schema?.required as string[] | undefined) ?? []);

  // Usage line
  const prog = `mcp ${serverName} ${tool.name}`;
  const usageParts = Object.entries(props ?? {}).map(([key]) => {
    const r = required.has(key);
    return r ? `--${key} <${key}>` : `[--${key} <${key}>]`;
  });
  console.log(`${label("Usage")}\n`);
  console.log(`  ${prog} ${usageParts.join(" ")}\n`);

  if (tool.description) console.log(`  ${tool.description}\n`);

  if (props && Object.keys(props).length) {
    console.log(`${label("Flags")}\n`);
    for (const [key, prop] of Object.entries(props)) {
      const req = required.has(key) ? value("required") : dim("optional");
      const type = prop.type ? dim(String(prop.type)) : dim("string");
      console.log(`  ${highlight(`--${key}`)}  ${type}  ${req}`);
      if (prop.description) console.log(`    ${dim(String(prop.description))}`);
      if (prop.enum)
        console.log(
          `    ${dim(`values: ${(prop.enum as unknown[]).join(" | ")}`)}`,
        );
    }
  } else {
    console.log(dim("  (no arguments)"));
  }
}

function formatMcpError(error: Record<string, unknown>): string {
  const msg = error.message as string | undefined;
  const data = error.data as Record<string, unknown> | undefined;
  const code = error.code as string | undefined;

  const lines: string[] = [];

  if (msg && msg !== "Error") {
    lines.push(msg);
  }

  if (data && Array.isArray(data)) {
    const missing: string[] = [];
    for (const item of data) {
      if (typeof item === "object" && item !== null) {
        const path = (item.path as string[] | undefined)?.join(".");
        const itemMsg = item.message as string | undefined;
        if (path) {
          missing.push(
            `${highlight(`--${path}`)}  ${dim(itemMsg ?? code ?? "invalid")}`,
          );
        }
      }
    }
    if (missing.length) {
      if (lines.length) lines.push("");
      lines.push(...missing);
    }
  }

  return lines.length ? lines.join("\n") : JSON.stringify(error);
}

function formatTextContentError(text: string): string | null {
  const mcpErrorMatch = text.match(/^MCP error (-?\d+):\s*(.*)$/s);
  if (!mcpErrorMatch) return null;

  const message = mcpErrorMatch[2];
  const lines: string[] = [];

  const dataMatch = message.match(/:\s*(\[[\s\S]*\])$/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]) as Array<Record<string, unknown>>;
      for (const item of data) {
        const path = ((item.path as string[] | undefined)?.join("."));
        const itemMsg = item.message as string | undefined;
        if (path) {
          lines.push(
            `  ${highlight(`--${path}`)}  ${dim(itemMsg ?? "invalid")}`,
          );
        }
      }
    } catch {}
  }

  if (lines.length) return lines.join("\n");
  return message.split('\n')[0];
}

async function cmdCall(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
): Promise<void> {
  try {
    const result = await callTool(serverConfig, serverName, toolName, toolArgs);

    const content = result?.content;
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text") {
          const formatted = formatTextContentError(block.text);
          if (formatted) {
            await listTools(serverConfig, serverName).then((tools) => {
              const tool = tools.find(t => t.name === toolName) as { name: string; description?: string; inputSchema?: Record<string, unknown> } | undefined;
              if (!tool || !tool.inputSchema) return;

              const schema = tool.inputSchema;
              const props = schema?.properties as Record<string, Record<string, unknown>> | undefined;
              const required = new Set((schema?.required as string[] | undefined) ?? []);

              const prog = `mcp ${serverName} ${tool.name}`;
              const usageParts = Object.entries(props ?? {}).map(([key]) => {
                const r = required.has(key);
                return r ? `--${key} <${key}>` : `[--${key} <${key}>]`;
              });
              console.log(`${prog} ${usageParts.join(" ")}\n`);
            }).catch(() => {});

            console.error(formatted);
            process.exit(1);
          }
          try {
            const parsed = JSON.parse(block.text);
            printJson(parsed);
          } catch {
            console.log(block.text);
          }
        } else {
          printJson(block);
        }
      }
    } else {
      printJson(result);
    }
  } catch (e) {
    const err = e as Error;
    let msg = err.message;

    // Try to extract JSON-RPC error from various message formats
    let errorObj: Record<string, unknown> | null = null;

    // Format: "tools/call: {jsonrpc error}"
    const colonMatch = msg.match(/:\s*(\{[\s\S]*\}|\[[\s\S]*\])$/);
    if (colonMatch) {
      try {
        const parsed = JSON.parse(colonMatch[1]);
        if ((parsed as Record<string, unknown>).jsonrpc === "2.0") {
          errorObj = (parsed as Record<string, unknown>).error as Record<string, unknown>;
        } else if ((parsed as Record<string, unknown>).error) {
          errorObj = (parsed as Record<string, unknown>).error as Record<string, unknown>;
        } else {
          errorObj = parsed as Record<string, unknown>;
        }
      } catch {}
    }

    // Fallback: try parsing entire message
    if (!errorObj) {
      try {
        const parsed = JSON.parse(msg);
        errorObj = (parsed as Record<string, unknown>).error ?? parsed;
      } catch {}
    }

    if (errorObj) {
      msg = formatMcpError(errorObj);
    }

    console.error(errStyle(msg));
    process.exit(1);
  }
}

function cmdLogout(serverName: string): void {
  const tokens = loadTokens();
  if (!tokens[serverName]) {
    console.log(dim(`No stored token for ${serverName}.`));
    return;
  }
  delete tokens[serverName];
  saveTokens(tokens);
  console.log(value(`Logged out of ${serverName}.`));
}

// --- CLI plumbing ---

function printUsage(): void {
  const prog = path.basename(process.argv[1] ?? "mcp-cli.ts");
  process.stderr.write(`Usage:
  ${prog} list                                    List configured MCP servers
  ${prog} <server> --help                         List tools for a server
  ${prog} <server> <tool> --help                  Show a tool's arguments
  ${prog} <server> <tool> [--key value ...]  Call a tool
  ${prog} <server> auth                           Re-run OAuth flow
  ${prog} <server> logout                         Clear stored token
`);
}

function extractFlag(argv: string[], flag: string): [string | null, string[]] {
  const rest: string[] = [];
  let val: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === flag && argv[i + 1] !== undefined) {
      val = argv[++i];
    } else if (argv[i].startsWith(`${flag}=`)) {
      val = argv[i].slice(flag.length + 1);
    } else {
      rest.push(argv[i]);
    }
  }
  return [val, rest];
}

// Coerces flag values: true/false/null → primitive, bare integers/floats → number, else string.
// Pure-numeric strings are kept as strings because most MCP tools type IDs as string.
function coerceValue(v: string): unknown {
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  return v;
}

function parseToolArgs(argv: string[]): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      args[key] = coerceValue(next);
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

async function main(): Promise<number> {
  const prog = path.basename(process.argv[1] ?? "mcp-cli.ts");
  let argv = process.argv.slice(2);
  const first = argv[0];

  if (!first || first === "-h" || first === "--help") {
    printUsage();
    return first ? 0 : 2;
  }

  const config = loadConfig();

  if (first === "list") {
    cmdList(config);
    return 0;
  }

  const serverName = first;
  argv = argv.slice(1);

  let token: string | null;
  [token, argv] = extractFlag(argv, "--token");

  const rawServerConfig = config.mcpServers?.[serverName];
  if (!rawServerConfig) {
    console.error(
      errStyle(
        `Server "${serverName}" not found. Run 'mcp-cli list' to see available servers.`,
      ),
    );
    return 1;
  }
  if (!rawServerConfig.url) {
    console.error(
      errStyle(
        "Only HTTP MCP servers are supported (this server uses stdio transport).",
      ),
    );
    return 1;
  }

  const sub = argv[0];

  if (sub === "logout") {
    cmdLogout(serverName);
    return 0;
  }

  if (sub === "auth") {
    await getOAuthToken(
      rawServerConfig as { url: string },
      serverName,
      (msg) => process.stderr.write(dim(msg)),
      { forceRefresh: true },
    );
    return 0;
  }

  const serverConfig = await resolveAuth(rawServerConfig, serverName, token);

  if (sub === "tools" || sub === "--help" || sub === "-h") {
    await cmdTools(serverConfig, serverName);
    return 0;
  }

  // `mcp <server> <tool> --help` → show tool schema
  const rest = argv.slice(1);
  if (rest.includes("--help") || rest.includes("-h")) {
    await cmdToolHelp(serverConfig, serverName, sub);
    return 0;
  }

  // Treat any unrecognised subcommand as a tool name shorthand: `mcp <server> <tool> [flags]`
  await cmdCall(serverConfig, serverName, sub, parseToolArgs(rest));
  return 0;
}

try {
  const code = await main();
  process.exit(code ?? 0);
} catch (e) {
  const err = e as Error;
  let msg = err.message;

  const colonMatch = msg.match(/:\s*(\{[\s\S]*\}|\[[\s\S]*\])$/);
  if (colonMatch) {
    try {
      const parsed = JSON.parse(colonMatch[1]);
      if ((parsed as Record<string, unknown>).jsonrpc === "2.0" && (parsed as Record<string, unknown>).error) {
        msg = formatMcpError((parsed as Record<string, unknown>).error as Record<string, unknown>);
      }
    } catch {}
  }

  console.error(errStyle(msg));
  process.exit(1);
}
