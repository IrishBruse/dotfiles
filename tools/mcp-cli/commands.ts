import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { loadTokens, saveTokens } from "./oauth.ts";
import type { McpConfig, McpResult, ServerConfig } from "./client.ts";
import { callTool, listTools } from "./client.ts";
import { normalizeConfluenceToolJson } from "./confluence-dates.ts";

// --- Colors ---

export const RESET = "\u001b[0m";
export const BOLD = "\u001b[1m";
export const DIM = "\u001b[2m";
export const C_CYAN = "\u001b[36m";
export const C_GREEN = "\u001b[32m";
export const C_YELLOW = "\u001b[33m";
export const C_RED = "\u001b[31m";

export function useColor(): boolean {
  return !process.env.NO_COLOR?.trim() && Boolean(process.stdout.isTTY);
}

export const label = (s: string) => (useColor() ? `${C_CYAN}${BOLD}${s}${RESET}` : s);
export const value = (s: string) => (useColor() ? `${C_GREEN}${s}${RESET}` : s);
export const highlight = (s: string) =>
  useColor() ? `${C_YELLOW}${BOLD}${s}${RESET}` : s;
export const dim = (s: string) => (useColor() ? `${DIM}${s}${RESET}` : s);
export const errStyle = (s: string) => (useColor() ? `${C_RED}${s}${RESET}` : s);

export function printJson(data: unknown): void {
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

// --- Config path ---

export const CONFIG_PATH = path.join(os.homedir(), ".config", "mcp-cli", "mcp.json");

// --- Commands ---

export function cmdList(config: McpConfig): void {
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

export async function cmdTools(
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

export async function cmdToolHelp(
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

export function formatMcpError(error: Record<string, unknown>): string {
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

/** Plain-text MCP validation errors from tools/call text blocks (no ANSI). */
export function formatTextContentErrorPlain(text: string): string | null {
  const mcpErrorMatch = text.match(/^MCP error (-?\d+):\s*(.*)$/s);
  if (!mcpErrorMatch) return null;

  const message = mcpErrorMatch[2];
  const lines: string[] = [];

  const dataMatch = message.match(/:\s*(\[[\s\S]*\])$/);
  if (dataMatch) {
    try {
      const data = JSON.parse(dataMatch[1]) as Array<Record<string, unknown>>;
      for (const item of data) {
        if (typeof item === "object" && item !== null) {
          const path = ((item.path as string[] | undefined)?.join("."));
          const itemMsg = item.message as string | undefined;
          if (path) {
            lines.push(`  --${path}  ${itemMsg ?? "invalid"}`);
          }
        }
      }
    } catch {}
  }

  if (lines.length) return lines.join("\n");
  return message.split("\n")[0];
}

function formatTextContentError(text: string): string | null {
  const plain = formatTextContentErrorPlain(text);
  if (!plain) return null;
  return plain
    .split("\n")
    .map((line) => {
      const m = line.match(/^  (--\S+)\s{2}(.+)$/);
      if (m) return `  ${highlight(m[1])}  ${dim(m[2])}`;
      return line;
    })
    .join("\n");
}

export async function cmdCall(
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
            printJson(normalizeConfluenceToolJson(toolName, parsed));
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

export function cmdLogout(serverName: string): void {
  const tokens = loadTokens();
  if (!tokens[serverName]) {
    console.log(dim(`No stored token for ${serverName}.`));
    return;
  }
  delete tokens[serverName];
  saveTokens(tokens);
  console.log(value(`Logged out of ${serverName}.`));
}
