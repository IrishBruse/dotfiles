import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Path segment index or fixed scope name for {{name}}. */
export interface CommitNameSource {
  segment?: number;
  literal?: string;
}

/** One commit message rule in commit.config.json. */
export interface CommitRule {
  paths: string | string[];
  message: string;
  /** all = every staged file matches; any = at least one file matches */
  when?: "all" | "any";
  name?: CommitNameSource;
}

export interface CommitConfig {
  version?: number;
  defaults?: Pick<CommitRule, "when">;
  rules?: CommitRule[];
}

const CONFIG_FILE = "commit.config.json";

export function loadCommitConfig(repoRoot: string): CommitConfig | undefined {
  const path = join(repoRoot, CONFIG_FILE);
  if (!existsSync(path)) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object") {
    return undefined;
  }
  return parseCommitConfig(parsed as Record<string, unknown>);
}

export function normalizeRulePaths(paths: string | string[]): string[] {
  if (typeof paths === "string") {
    return paths.length > 0 ? [paths] : [];
  }
  return paths.filter((path) => path.length > 0);
}

function parseCommitConfig(raw: Record<string, unknown>): CommitConfig | undefined {
  const rules = parseRules(raw.rules) ?? parseLegacyScopes(raw.scopes);
  if (rules === undefined) {
    return undefined;
  }

  const config: CommitConfig = { rules };
  const version = raw.version;
  if (typeof version === "number" && Number.isInteger(version) && version > 0) {
    config.version = version;
  }

  const defaults = parseDefaults(raw.defaults);
  if (defaults !== undefined) {
    config.defaults = defaults;
  }

  return config;
}

function parseDefaults(
  value: unknown
): Pick<CommitRule, "when"> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const when = (value as { when?: unknown }).when;
  if (when === undefined) {
    return undefined;
  }
  if (when !== "all" && when !== "any") {
    return undefined;
  }
  return { when };
}

function parseRules(value: unknown): CommitRule[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const rules: CommitRule[] = [];
  for (const entry of value) {
    const rule = parseRule(entry);
    if (rule !== undefined) {
      rules.push(rule);
    }
  }
  return rules.length > 0 ? rules : undefined;
}

function parseLegacyScopes(value: unknown): CommitRule[] | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const rules: CommitRule[] = [];
  for (const [path, rule] of Object.entries(value)) {
    if (path.length === 0 || !rule || typeof rule !== "object") {
      continue;
    }
    const legacy = rule as {
      message?: unknown;
      when?: unknown;
      name?: unknown;
    };
    if (typeof legacy.message !== "string" || legacy.message.length === 0) {
      continue;
    }
    const parsed: CommitRule = {
      paths: path,
      message: legacy.message
    };
    if (legacy.when === "all" || legacy.when === "any") {
      parsed.when = legacy.when;
    }
    const name = parseNameSource(legacy.name);
    if (name !== undefined) {
      parsed.name = name;
    }
    rules.push(parsed);
  }
  return rules.length > 0 ? rules : undefined;
}

function parseRule(value: unknown): CommitRule | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as {
    paths?: unknown;
    message?: unknown;
    when?: unknown;
    name?: unknown;
  };
  if (typeof raw.message !== "string" || raw.message.length === 0) {
    return undefined;
  }
  const paths = parsePaths(raw.paths);
  if (paths === undefined) {
    return undefined;
  }
  if (raw.when !== undefined && raw.when !== "all" && raw.when !== "any") {
    return undefined;
  }
  const name = parseNameSource(raw.name);
  if (raw.name !== undefined && name === undefined) {
    return undefined;
  }

  const rule: CommitRule = { paths, message: raw.message };
  if (raw.when !== undefined) {
    rule.when = raw.when;
  }
  if (name !== undefined) {
    rule.name = name;
  }
  return rule;
}

function parsePaths(value: unknown): string | string[] | undefined {
  if (typeof value === "string") {
    return value.length > 0 ? value : undefined;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }
  const paths = value.filter(
    (path): path is string => typeof path === "string" && path.length > 0
  );
  return paths.length > 0 ? paths : undefined;
}

function parseNameSource(value: unknown): CommitNameSource | undefined {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? { segment: value } : undefined;
  }
  if (typeof value === "string") {
    return value.length > 0 ? { literal: value } : undefined;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as { segment?: unknown; literal?: unknown };
  const source: CommitNameSource = {};
  if (raw.segment !== undefined) {
    if (!Number.isInteger(raw.segment) || (raw.segment as number) < 0) {
      return undefined;
    }
    source.segment = raw.segment as number;
  }
  if (raw.literal !== undefined) {
    if (typeof raw.literal !== "string" || raw.literal.length === 0) {
      return undefined;
    }
    source.literal = raw.literal;
  }
  if (source.segment === undefined && source.literal === undefined) {
    return undefined;
  }
  return source;
}
