import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Machine-local fields kept out of the repo copy. */
const CURSOR_CLI_LOCAL_KEYS = [
  "privacyCache",
  "serverConfigCache",
  "authInfo"
] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Merge repo agent-config with live cli-config; live wins except modelParameters keys union. */
function mergeAgentConfig(
  existing: Record<string, unknown>,
  live: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...existing, ...live };
  if (isPlainObject(existing.modelParameters) && isPlainObject(live.modelParameters)) {
    merged.modelParameters = {
      ...existing.modelParameters,
      ...live.modelParameters
    };
  }
  return merged;
}

export function cursorAgentConfig(repo: string): void {
  const cursorDir = join(repo, "home/.cursor");
  mkdirSync(cursorDir, { recursive: true });
  const agentConfigFile = join(cursorDir, "agent-config.json");
  const cliConfig = join(homedir(), ".cursor/cli-config.json");
  if (!existsSync(cliConfig)) {
    return;
  }
  const live = JSON.parse(readFileSync(cliConfig, "utf8")) as Record<
    string,
    unknown
  >;
  for (const key of CURSOR_CLI_LOCAL_KEYS) {
    delete live[key];
  }
  const existing = existsSync(agentConfigFile)
    ? (JSON.parse(readFileSync(agentConfigFile, "utf8")) as Record<
        string,
        unknown
      >)
    : {};
  const config = mergeAgentConfig(existing, live);
  writeFileSync(
    agentConfigFile,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
}
