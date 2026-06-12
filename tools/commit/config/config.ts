import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** One commit message rule in commit.config.json. */
export interface CommitRule {
  paths: string | string[];
  /** Subject prefix, e.g. config in config(code): summary */
  prefix: string;
  /** Fixed scope when the path pattern does not use :scope */
  scope?: string;
  /** Optional subject override; {{summary}} and {{scope}} are expanded when present */
  message?: string;
  /** all = every staged file matches; any = at least one file matches */
  when?: "all" | "any";
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
    const parsed = migrateLegacyRule(path, legacy.message, legacy.name);
    if (parsed === undefined) {
      continue;
    }
    if (legacy.when === "all" || legacy.when === "any") {
      parsed.when = legacy.when;
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
    prefix?: unknown;
    scope?: unknown;
    message?: unknown;
    when?: unknown;
  };
  const paths = parsePaths(raw.paths);
  if (paths === undefined) {
    return undefined;
  }
  if (raw.when !== undefined && raw.when !== "all" && raw.when !== "any") {
    return undefined;
  }
  if (
    raw.scope !== undefined &&
    (typeof raw.scope !== "string" || raw.scope.length === 0)
  ) {
    return undefined;
  }
  if (
    raw.message !== undefined &&
    (typeof raw.message !== "string" || raw.message.length === 0)
  ) {
    return undefined;
  }
  if (typeof raw.prefix !== "string" || raw.prefix.length === 0) {
    return undefined;
  }

  const rule: CommitRule = { paths, prefix: raw.prefix };
  if (raw.when !== undefined) {
    rule.when = raw.when;
  }
  if (typeof raw.scope === "string") {
    rule.scope = raw.scope;
  }
  if (typeof raw.message === "string") {
    rule.message = raw.message;
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

function migrateLegacyRule(
  paths: string,
  message: string,
  name: unknown
): CommitRule | undefined {
  const withoutSummary = message.replace(/: \{\{summary\}\}$/, "");
  const colonOnly = withoutSummary.match(/^([^:({]+)$/);
  if (colonOnly) {
    return { paths, prefix: colonOnly[1]!.trim() };
  }

  const fixedScope = withoutSummary.match(/^([^(]+)\(([^)]+)\)$/);
  if (fixedScope && !fixedScope[2]!.includes("{{")) {
    return {
      paths,
      prefix: fixedScope[1]!.trim(),
      scope: fixedScope[2]!.trim()
    };
  }

  const dynamicScope = withoutSummary.match(/^([^(]+)\(\{\{name\}\}\)$/);
  if (dynamicScope) {
    const prefix = dynamicScope[1]!.trim();
    const segment = parseLegacyNameSegment(name);
    if (segment === undefined) {
      return undefined;
    }
    return {
      paths: upgradePathForCapture(paths, segment),
      prefix
    };
  }

  return undefined;
}

function parseLegacyNameSegment(name: unknown): number | undefined {
  if (typeof name === "number") {
    return Number.isInteger(name) && name >= 0 ? name : undefined;
  }
  if (!name || typeof name !== "object" || Array.isArray(name)) {
    return undefined;
  }
  const segment = (name as { segment?: unknown }).segment;
  if (!Number.isInteger(segment) || (segment as number) < 0) {
    return undefined;
  }
  return segment as number;
}

function upgradePathForCapture(path: string, segmentIndex: number): string {
  const parts = path.split("/");
  if (segmentIndex < parts.length && parts[segmentIndex] === "*") {
    parts[segmentIndex] = ":scope";
    return parts.join("/");
  }
  return path;
}
