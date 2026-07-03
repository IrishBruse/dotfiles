import { spawnSync } from "node:child_process";

const MCP_ID = "atlassian";

function agentBin(): string | null {
  const result = spawnSync("sh", ["-c", "command -v agent"], {
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  const bin = result.stdout.trim();
  return bin || null;
}

function atlassianNeedsAuth(agent: string): boolean | null {
  const result = spawnSync(agent, ["mcp", "list"], { encoding: "utf8" });
  if (result.status !== 0) return null;

  for (const line of result.stdout.split(/\r?\n/)) {
    const match = line.match(/^atlassian:\s+(.+)$/);
    if (!match) continue;
    return match[1].trim() === "requires_authentication";
  }
  return null;
}

/** Run `agent mcp login atlassian` when `agent mcp list` reports auth required. */
export function ensureAtlassianMcpAuth(): void {
  const agent = agentBin();
  if (!agent) return;

  const needsAuth = atlassianNeedsAuth(agent);
  if (needsAuth !== true) return;

  spawnSync(agent, ["mcp", "login", MCP_ID], { stdio: "inherit" });
}
