import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

/** Jira CLI settings loaded from `~/.config/jira/config.json`. */
export type JiraConfig = {
  site: string;
  meAccountId: string;
  boardId: string;
  project: string;
  boardJql: string;
  featureTeamField: string;
  epicLinkField: string;
  clean: boolean;
  boardCacheMaxAgeDays: number;
  /** Atlassian cloud UUID for MCP tool calls (optional). */
  cloudId: string;
  /** Human display name for meAccountId (optional, cache may override). */
  meDisplayName: string;
  /** Feature Team option name used by board JQL (optional). */
  featureTeam: string;
  /** Feature Team option id for creates (optional, cache may override). */
  featureTeamOptionId: string;
};

const REQUIRED_STRING_KEYS = [
  "site",
  "meAccountId",
  "boardId",
  "project",
  "boardJql",
  "featureTeamField",
  "epicLinkField"
] as const;

const OPTIONAL_STRING_KEYS = [
  "cloudId",
  "meDisplayName",
  "featureTeam",
  "featureTeamOptionId"
] as const;

/** Default runtime path: `~/.config/jira/config.json`. */
export function jiraConfigPath(baseDir = homedir()): string {
  return path.join(baseDir, ".config", "jira", "config.json");
}

let cachedConfig: JiraConfig | undefined;
let configPathOverride: string | undefined;

function parseJiraConfig(raw: unknown, filePath: string): JiraConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Jira config must be a JSON object: ${filePath}`);
  }
  const record = raw as Record<string, unknown>;
  const out = {} as JiraConfig;

  for (const key of REQUIRED_STRING_KEYS) {
    const value = record[key];
    if (typeof value !== "string") {
      throw new Error(`Jira config "${key}" must be a string: ${filePath}`);
    }
    out[key] = value;
  }

  for (const key of OPTIONAL_STRING_KEYS) {
    const value = record[key];
    if (value === undefined) {
      out[key] = "";
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(`Jira config "${key}" must be a string: ${filePath}`);
    }
    out[key] = value;
  }

  const clean = record.clean;
  if (typeof clean !== "boolean") {
    throw new Error(`Jira config "clean" must be a boolean: ${filePath}`);
  }
  out.clean = clean;

  const boardCacheMaxAgeDays = record.boardCacheMaxAgeDays;
  if (
    typeof boardCacheMaxAgeDays !== "number" ||
    !Number.isFinite(boardCacheMaxAgeDays) ||
    boardCacheMaxAgeDays < 0
  ) {
    throw new Error(
      `Jira config "boardCacheMaxAgeDays" must be a non-negative number: ${filePath}`
    );
  }
  out.boardCacheMaxAgeDays = boardCacheMaxAgeDays;

  return out;
}

function readJiraConfigFile(filePath: string): JiraConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Jira config is not valid JSON (${filePath}): ${msg}`);
  }
  return parseJiraConfig(parsed, filePath);
}

/** Load and cache Jira config from disk. */
export function loadJiraConfig(): JiraConfig {
  if (cachedConfig) return cachedConfig;
  const filePath = configPathOverride ?? jiraConfigPath();
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Jira config not found: ${filePath} (copy tools/jira/jira.config.example.json to ~/.config/jira/config.json)`
    );
  }
  cachedConfig = readJiraConfigFile(filePath);
  return cachedConfig;
}

/** Normalized project key from config.project. */
export function configuredProject(config: JiraConfig = loadJiraConfig()): string {
  return config.project.trim().toUpperCase();
}

/** Point config loading at a file (tests). */
export function setJiraConfigPathForTests(filePath: string | undefined): void {
  configPathOverride = filePath;
  cachedConfig = undefined;
}

/** Inject config without reading disk (tests). */
export function setJiraConfigForTests(config: JiraConfig | undefined): void {
  cachedConfig = config;
  configPathOverride = undefined;
}

/** Lazy config object for existing CONFIG.site call sites. */
export const CONFIG: JiraConfig = new Proxy({} as JiraConfig, {
  get(_target, prop: keyof JiraConfig) {
    return loadJiraConfig()[prop];
  }
});
