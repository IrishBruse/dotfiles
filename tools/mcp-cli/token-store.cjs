/**
 * MCP OAuth token persistence: macOS Keychain on darwin (unless MCP_CLI_TOKEN_STORE=file),
 * else ~/.config/mcp-cli/tokens.json.
 *
 * .cjs so require() works under parent package.json "type": "module".
 */
const { execFileSync } = require("node:child_process");
const { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const TOKENS_PATH = path.join(os.homedir(), ".config", "mcp-cli", "tokens.json");
const KEYCHAIN_SERVICE = "mcp-cli-oauth";
const KEYCHAIN_ACCOUNT = "default";

function useKeychain() {
  return process.platform === "darwin" && process.env.MCP_CLI_TOKEN_STORE !== "file";
}

function loadTokensFromFile() {
  try {
    return JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function loadTokensFromKeychain() {
  try {
    const out = execFileSync(
      "security",
      ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT, "-w"],
      { encoding: "utf-8" },
    );
    const trimmed = out.trim();
    if (!trimmed) return null;
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function deleteKeychainItem() {
  try {
    execFileSync("security", ["delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", KEYCHAIN_ACCOUNT]);
  } catch {
    /* item may not exist */
  }
}

function writeKeychainJson(json) {
  deleteKeychainItem();
  execFileSync("security", [
    "add-generic-password",
    "-a",
    KEYCHAIN_ACCOUNT,
    "-s",
    KEYCHAIN_SERVICE,
    "-w",
    json,
  ]);
}

function removePlaintextTokensFile() {
  if (!existsSync(TOKENS_PATH)) return;
  try {
    unlinkSync(TOKENS_PATH);
  } catch {
    /* ignore */
  }
}

function loadTokens() {
  if (!useKeychain()) {
    return loadTokensFromFile();
  }
  const fromKeychain = loadTokensFromKeychain();
  if (fromKeychain != null) return fromKeychain;
  return loadTokensFromFile();
}

function saveTokens(tokens) {
  if (!useKeychain()) {
    mkdirSync(path.dirname(TOKENS_PATH), { recursive: true });
    writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), "utf-8");
    return;
  }

  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) {
    throw new TypeError("saveTokens expects a plain object");
  }

  const keys = Object.keys(tokens);
  if (keys.length === 0) {
    deleteKeychainItem();
    removePlaintextTokensFile();
    return;
  }

  writeKeychainJson(JSON.stringify(tokens));
  removePlaintextTokensFile();
}

function getTokenStoreDescription() {
  if (useKeychain()) {
    return `macOS Keychain (service ${KEYCHAIN_SERVICE})`;
  }
  return TOKENS_PATH;
}

module.exports = {
  TOKENS_PATH,
  KEYCHAIN_SERVICE,
  KEYCHAIN_ACCOUNT,
  loadTokens,
  saveTokens,
  getTokenStoreDescription,
};
