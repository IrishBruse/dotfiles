#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { getOAuthToken } from "./oauth.ts";
import type { McpConfig, ServerConfig } from "./client.ts";
import {
  cmdCall,
  cmdList,
  cmdLogout,
  cmdToolHelp,
  cmdTools,
  dim,
  errStyle,
  formatMcpError,
} from "./commands.ts";
import { CONFIG_PATH } from "./commands.ts";

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

// --- Main ---

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
