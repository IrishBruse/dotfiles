import {
  type CommitConfig,
  type CommitRule,
  normalizeRulePaths
} from "./config.ts";
import type { ConfigMatch, MessageVars } from "../types.ts";

interface PathPattern {
  regex: RegExp;
  scopeGroup?: number;
}

const patternCache = new Map<string, PathPattern>();

export function findConfigMatch(
  config: CommitConfig,
  stagedPaths: string[]
): ConfigMatch | undefined {
  if (stagedPaths.length === 0 || !config.rules) {
    return undefined;
  }

  for (const rule of config.rules) {
    const match = matchRule(rule, stagedPaths, config.defaults?.when);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function resolveSliceGroup(
  path: string,
  config: CommitConfig | undefined,
  stagedPaths: string[] = []
): string {
  if (config?.rules) {
    for (const rule of config.rules) {
      const globs = normalizeRulePaths(rule.paths);
      if (!globs.some((glob) => matchPathPattern(path, glob).matched)) {
        continue;
      }
      const sliceBase = globs[0]!;
      const capturedScope = resolveCapturedScope(globs, [path]);
      const scope = rule.scope ?? capturedScope;
      if (scope !== undefined) {
        return `${sliceBase}\0${scope}`;
      }
      return sliceBase;
    }
  }

  const soleToolsScope = soleToolsSubprojectScope(stagedPaths);
  if (soleToolsScope !== undefined && isToolsRootFile(path)) {
    for (const rule of config?.rules ?? []) {
      const globs = normalizeRulePaths(rule.paths);
      if (globs.some((glob) => glob.startsWith("tools/:scope"))) {
        return `${globs[0]!}\0${soleToolsScope}`;
      }
    }
  }

  return path.includes("/") ? (path.split("/")[0] ?? path) : path;
}

function isToolsRootFile(filePath: string): boolean {
  const parts = filePath.split("/");
  return parts[0] === "tools" && parts.length === 2;
}

function soleToolsSubprojectScope(stagedPaths: string[]): string | undefined {
  const scopes = new Set<string>();
  for (const stagedPath of stagedPaths) {
    const match = stagedPath.match(/^tools\/([^/]+)\//);
    if (match) {
      scopes.add(match[1]!);
    }
  }
  if (scopes.size !== 1) {
    return undefined;
  }
  return [...scopes][0];
}

export function formatCommitMessage(
  rule: CommitRule,
  capturedScope: string | undefined,
  summary: string
): string {
  const scope = rule.scope ?? capturedScope;
  if (rule.message !== undefined) {
    return expandMessage(rule.message, { summary, scope });
  }
  if (scope !== undefined) {
    return `${rule.prefix}(${scope}): ${summary}`;
  }
  return `${rule.prefix}: ${summary}`;
}

export function expandMessage(message: string, vars: MessageVars): string {
  let out = message;
  if (vars.scope !== undefined) {
    out = out.replaceAll("{{scope}}", vars.scope);
  }
  if (vars.type !== undefined) {
    out = out.replaceAll("{{type}}", vars.type);
  }
  out = out.replaceAll("{{summary}}", vars.summary);
  return out;
}

export function pathMatchesGlob(path: string, glob: string): boolean {
  return matchPathPattern(path, glob).matched;
}

function matchRule(
  rule: CommitRule,
  stagedPaths: string[],
  defaultWhen: CommitRule["when"] | undefined
): ConfigMatch | undefined {
  const when = rule.when ?? defaultWhen ?? "any";
  const globs = normalizeRulePaths(rule.paths);
  const matchingPaths = stagedPaths.filter((path) =>
    globs.some((glob) => matchPathPattern(path, glob).matched)
  );

  if (when === "all") {
    if (matchingPaths.length !== stagedPaths.length) {
      return undefined;
    }
  } else if (matchingPaths.length === 0) {
    return undefined;
  }

  const capturedScope = resolveCapturedScope(globs, matchingPaths);
  if (needsCapturedScope(rule, globs) && capturedScope === undefined) {
    return undefined;
  }

  return { rule, capturedScope };
}

function needsCapturedScope(rule: CommitRule, globs: string[]): boolean {
  return (
    rule.scope === undefined && globs.some((glob) => glob.includes(":scope"))
  );
}

function resolveCapturedScope(
  globs: string[],
  paths: string[]
): string | undefined {
  const counts = new Map<string, number>();
  for (const path of paths) {
    for (const glob of globs) {
      const { matched, scope } = matchPathPattern(path, glob);
      if (!matched || scope === undefined) {
        continue;
      }
      counts.set(scope, (counts.get(scope) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    return undefined;
  }

  let best = "";
  let bestCount = 0;
  for (const [scope, count] of counts) {
    if (count > bestCount) {
      best = scope;
      bestCount = count;
    }
  }
  return best === "" ? undefined : best;
}

function matchPathPattern(
  path: string,
  pattern: string
): { matched: boolean; scope?: string } {
  const compiled = compilePathPattern(pattern);
  const match = compiled.regex.exec(path);
  if (!match) {
    return { matched: false };
  }
  const scope =
    compiled.scopeGroup === undefined
      ? undefined
      : match[compiled.scopeGroup]?.toLowerCase();
  return scope === "" ? { matched: true } : { matched: true, scope };
}

function compilePathPattern(pattern: string): PathPattern {
  let cached = patternCache.get(pattern);
  if (cached) {
    return cached;
  }

  let re = "^";
  let scopeGroup: number | undefined;
  let groupCount = 0;

  for (let i = 0; i < pattern.length; ) {
    if (pattern[i] === ":" && pattern.startsWith(":scope", i)) {
      const end = i + 6;
      if (end === pattern.length || pattern[end] === "/") {
        groupCount += 1;
        scopeGroup = groupCount;
        re += "([^/]+)";
        i = end;
        continue;
      }
    }

    const c = pattern[i]!;
    if (c === "*") {
      if (pattern[i + 1] === "*") {
        if (pattern[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 3;
          continue;
        }
        re += ".*";
        i += 2;
        continue;
      }
      re += "[^/]*";
      i += 1;
      continue;
    }
    re += escapeRegExp(c);
    i += 1;
  }

  re += "$";
  cached = { regex: new RegExp(re), scopeGroup };
  patternCache.set(pattern, cached);
  return cached;
}

function escapeRegExp(char: string): string {
  return char.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
}
