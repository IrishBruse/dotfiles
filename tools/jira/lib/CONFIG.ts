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
};

const CONFIG_KEYS: (keyof JiraConfig)[] = [
  "site",
  "meAccountId",
  "boardId",
  "project",
  "boardJql",
  "featureTeamField",
  "epicLinkField",
  "clean",
  "boardCacheMaxAgeDays"
];

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
  for (const key of CONFIG_KEYS) {
    const value = record[key];
    if (key === "clean") {
      if (typeof value !== "boolean") {
        throw new Error(`Jira config "${key}" must be a boolean: ${filePath}`);
      }
      out.clean = value;
      continue;
    }
    if (key === "boardCacheMaxAgeDays") {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new Error(`Jira config "${key}" must be a non-negative number: ${filePath}`);
      }
      out.boardCacheMaxAgeDays = value;
      continue;
    }
    if (typeof value !== "string") {
      throw new Error(`Jira config "${key}" must be a string: ${filePath}`);
    }
    out[key] = value;
  }
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
