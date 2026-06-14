import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Machine-local fields kept out of the repo copy. */
const CURSOR_CLI_LOCAL_KEYS = [
  "privacyCache",
  "serverConfigCache",
  "authInfo"
] as const;

export function cursorAgentConfig(repo: string): void {
  const cursorDir = join(repo, "home/.cursor");
  mkdirSync(cursorDir, { recursive: true });
  const agentConfigFile = join(cursorDir, "agent-config.json");
  const cliConfig = join(homedir(), ".cursor/cli-config.json");
  if (!existsSync(cliConfig)) {
    return;
  }
  const config = JSON.parse(readFileSync(cliConfig, "utf8")) as Record<
    string,
    unknown
  >;
  for (const key of CURSOR_CLI_LOCAL_KEYS) {
    delete config[key];
  }
  writeFileSync(
    agentConfigFile,
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8"
  );
}
