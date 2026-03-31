// --- Types ---

export interface ServerConfig {
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}

export interface McpConfig {
  mcpServers?: Record<string, ServerConfig>;
}

export interface McpResult {
  result?: unknown;
  error?: unknown;
  content?: Array<{ type: string; text?: string }>;
}

// --- Session ---

export interface McpSession {
  config: ServerConfig;
  sessionId: string | null;
}

export function createSession(config: ServerConfig): McpSession {
  return { config, sessionId: null };
}

// --- Cache ---

interface CacheEntry {
  session: McpSession;
  tools: Array<{ name: string; description?: string }>;
  expires: number;
}

const _cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedSession(config: ServerConfig, serverName: string): McpSession {
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

export function getCachedTools(serverName: string): Array<{ name: string; description?: string }> | null {
  const cached = _cache.get(serverName);
  if (cached && cached.tools.length && cached.expires > Date.now()) {
    return cached.tools;
  }
  return null;
}

export function setCachedTools(serverName: string, tools: Array<{ name: string; description?: string }>): void {
  const cached = _cache.get(serverName);
  if (cached) {
    cached.tools = tools;
    cached.expires = Date.now() + CACHE_TTL;
  }
}

// --- JSON-RPC ---

let _reqId = 1;

export async function mcpPost(
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

export async function initialize(session: McpSession): Promise<unknown> {
  const res = await mcpPost(session, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "mcp-cli", version: "1.0.0" },
  });
  if (res?.error) throw new Error(`initialize: ${JSON.stringify(res.error)}`);
  return (res as Record<string, unknown>).result ?? res;
}

export async function listTools(
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

export async function callTool(
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


