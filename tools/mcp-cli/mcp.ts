#!/usr/bin/env node
/**
 * mcp-cli.ts - CLI wrapper for MCP servers defined in ~/.cursor/mcp.json
 *
 * Usage:
 *   mcp-cli list
 *   mcp-cli <server> --help
 *   mcp-cli <server> call <tool> [--args '{"key":"value"}']
 *   mcp-cli <server> auth     Re-run OAuth flow
 *   mcp-cli <server> logout   Clear stored token
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { TOKENS_PATH, loadTokens, saveTokens, getOAuthToken } from "./oauth.ts";

const CONFIG_PATH = path.join(os.homedir(), ".cursor", "mcp.json");

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
const highlight = (s: string) => (useColor() ? `${C_YELLOW}${BOLD}${s}${RESET}` : s);
const dim = (s: string) => (useColor() ? `${DIM}${s}${RESET}` : s);
const errStyle = (s: string) => (useColor() ? `${C_RED}${s}${RESET}` : s);

// --- Config ---

function loadConfig(): McpConfig {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as McpConfig;
  } catch (e) {
    console.error(errStyle(`Failed to read ${CONFIG_PATH}: ${(e as Error).message}`));
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
    return { ...serverConfig, headers: { ...serverConfig.headers, Authorization: `Bearer ${staticToken}` } };
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
  return { ...serverConfig, headers: { ...serverConfig.headers, Authorization: `Bearer ${token}` } };
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

async function mcpPost(session: McpSession, method: string, params: Record<string, unknown> = {}): Promise<McpResult> {
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
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text.slice(0, 200)}` : ""}`);
  }

  return res.json() as Promise<McpResult>;
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
  return messages.find((m) => (m as Record<string, unknown>).id === targetId) ?? messages.at(-1) ?? {};
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

async function listTools(serverConfig: ServerConfig): Promise<Array<{ name: string; description?: string }>> {
  const session = createSession(serverConfig);
  await initialize(session);
  const res = await mcpPost(session, "tools/list", {});
  if (res?.error) throw new Error(`tools/list: ${JSON.stringify(res.error)}`);
  const r = res as Record<string, unknown>;
  return (((r.result as Record<string, unknown>)?.tools ?? r.tools) as Array<{ name: string; description?: string }>) ?? [];
}

async function callTool(serverConfig: ServerConfig, toolName: string, toolArgs: Record<string, unknown>): Promise<McpResult> {
  const session = createSession(serverConfig);
  await initialize(session);
  const res = await mcpPost(session, "tools/call", { name: toolName, arguments: toolArgs });
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
  console.log(`${label(`MCP Servers (${entries.length})`)}  ${dim(CONFIG_PATH)}`);
  console.log();
  for (const [n, cfg] of entries) {
    const transport = cfg.url ? "http" : cfg.command ? "stdio" : "unknown";
    const loc = cfg.url ?? (cfg.command ? [cfg.command, ...(cfg.args ?? [])].join(" ") : "?");
    const hasStaticAuth = Boolean(cfg.headers?.Authorization);
    const hasStoredToken = Boolean(tokens[n]?.access_token);
    const authNote = hasStaticAuth ? dim(" [token]") : hasStoredToken ? dim(" [oauth]") : "";
    console.log(`  ${highlight(n)}  ${dim(transport)}  ${value(loc)}${authNote}`);
  }
}

async function cmdTools(serverConfig: ServerConfig, serverName: string): Promise<void> {
  process.stderr.write(dim(`Connecting to ${serverName}...\n`));
  const tools = await listTools(serverConfig);

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

async function cmdToolHelp(serverConfig: ServerConfig, serverName: string, toolName: string): Promise<void> {
  process.stderr.write(dim(`Connecting to ${serverName}...\n`));
  const tools = await listTools(serverConfig);
  const tool = tools.find((t) => t.name === toolName) as
    | ({ name: string; description?: string; inputSchema?: Record<string, unknown> })
    | undefined;

  if (!tool) {
    console.error(errStyle(`Tool "${toolName}" not found on ${serverName}.`));
    process.exit(1);
  }

  const schema = tool.inputSchema;
  const props = schema?.properties as Record<string, Record<string, unknown>> | undefined;
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
      if (prop.enum) console.log(`    ${dim(`one of: ${(prop.enum as unknown[]).join(", ")}`)}`);
    }
  } else {
    console.log(dim("  (no arguments)"));
  }
}

async function cmdCall(
  serverConfig: ServerConfig,
  serverName: string,
  toolName: string,
  toolArgs: Record<string, unknown>,
): Promise<void> {
  process.stderr.write(dim(`Calling ${serverName}/${toolName}...\n`));
  const result = await callTool(serverConfig, toolName, toolArgs);

  const content = result?.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === "text") {
        console.log(block.text);
      } else {
        console.log(JSON.stringify(block, null, 2));
      }
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
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

Options:
  --token <token>  Bearer token (overrides env/oauth). Also: MCP_<SERVER>_TOKEN env var.
  --args '{}'      Pass arguments as a JSON blob (alternative to individual flags).

Examples:
  ${prog} list
  ${prog} jira --help
  ${prog} jira getConfluencePage --help
  ${prog} jira getConfluencePage --cloudId a1b2-... --pageId FC1bw
  ${prog} coralogix get_datetime

Config: ${CONFIG_PATH}
Tokens: ${TOKENS_PATH}
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

/**
 * Parses tool arguments from argv.  Two forms are supported and can be mixed:
 *   --args '{"key":"val"}'       legacy JSON blob
 *   --cloudId abc --pageId 123   individual flags (preferred)
 * Individual flags take precedence over --args values.
 */
function parseToolArgs(argv: string[]): Record<string, unknown> {
  let base: Record<string, unknown> = {};

  // Pull out --args JSON blob first
  for (let i = 0; i < argv.length; i++) {
    let json: string | null = null;
    if (argv[i] === "--args" && argv[i + 1]) json = argv[++i];
    else if (argv[i].startsWith("--args=")) json = argv[i].slice("--args=".length);
    if (json !== null) {
      try { base = JSON.parse(json) as Record<string, unknown>; }
      catch { console.error(errStyle(`Invalid JSON for --args: ${json}`)); process.exit(1); }
    }
  }

  // Overlay individual --key [value] flags (skip --args itself)
  const overlay: Record<string, unknown> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "args") { i++; continue; } // already handled above
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      overlay[key] = coerceValue(next);
      i++;
    } else {
      overlay[key] = true;
    }
  }

  return { ...base, ...overlay };
}

async function main(): Promise<number> {
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
    console.error(errStyle(`Server "${serverName}" not found. Run 'mcp-cli list' to see available servers.`));
    return 1;
  }
  if (!rawServerConfig.url) {
    console.error(errStyle("Only HTTP MCP servers are supported (this server uses stdio transport)."));
    return 1;
  }

  const sub = argv[0];

  if (!sub) {
    console.error(errStyle(`Missing subcommand for "${serverName}". Try: --help, call, auth, logout`));
    return 2;
  }

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

main().then(
  (code) => process.exit(code ?? 0),
  (e) => {
    console.error(errStyle(String((e as Error)?.message ?? e)));
    process.exit(1);
  },
);
