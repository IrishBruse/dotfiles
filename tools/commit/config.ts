import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Scope settings keyed by a single path glob in commit.config.json. */
export interface CommitScopeRule {
  message: string;
  /** Path segment index or fixed scope name for {{name}} */
  name?: number | string;
  /** all = every staged file matches; any = at least one file matches */
  when?: "all" | "any";
  /** Shared slice key for PR split; scopes with the same group land in one commit */
  group?: string;
}

export interface CommitFallbackConfig {
  message: string;
}

export interface CommitConfig {
  scopes?: Record<string, CommitScopeRule>;
  fallback?: CommitFallbackConfig;
}

export const DEFAULT_FALLBACK_MESSAGE = "{{type}}({{scope}}): {{summary}}";

const CONFIG_FILE = "commit.config.json";

export function loadCommitConfig(repoRoot: string): CommitConfig | undefined {
  const path = join(repoRoot, CONFIG_FILE);
  if (!existsSync(path)) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object") {
    return undefined;
  }
  const raw = parsed as CommitConfig;
  const scopes = parseScopes(raw.scopes);
  const fallback = parseFallback(raw.fallback);
  if (scopes === undefined && fallback === undefined) {
    return undefined;
  }
  return {
    ...(scopes !== undefined ? { scopes } : {}),
    ...(fallback !== undefined ? { fallback } : {})
  };
}

function parseScopes(
  value: unknown
): Record<string, CommitScopeRule> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const scopes: Record<string, CommitScopeRule> = {};
  for (const [path, rule] of Object.entries(value)) {
    if (path.length === 0 || !isValidScope(rule)) {
      continue;
    }
    scopes[path] = rule;
  }
  return Object.keys(scopes).length > 0 ? scopes : undefined;
}

function parseFallback(value: unknown): CommitFallbackConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const fallback = value as CommitFallbackConfig;
  if (typeof fallback.message !== "string" || fallback.message.length === 0) {
    return undefined;
  }
  return fallback;
}

function isValidScope(value: unknown): value is CommitScopeRule {
  if (!value || typeof value !== "object") {
    return false;
  }
  const scope = value as CommitScopeRule;
  if (typeof scope.message !== "string" || scope.message.length === 0) {
    return false;
  }
  if (scope.when !== undefined && scope.when !== "all" && scope.when !== "any") {
    return false;
  }
  if (scope.name !== undefined) {
    if (typeof scope.name === "number") {
      return Number.isInteger(scope.name) && scope.name >= 0;
    }
    return typeof scope.name === "string" && scope.name.length > 0;
  }
  if (scope.group !== undefined) {
    return typeof scope.group === "string" && scope.group.length > 0;
  }
  return true;
}
