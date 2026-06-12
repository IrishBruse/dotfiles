import {
  type CommitConfig,
  type CommitNameSource,
  type CommitRule,
  normalizeRulePaths
} from "./config.ts";
import type { ConfigMatch, MessageVars } from "../types.ts";

const globCache = new Map<string, RegExp>();

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
  config: CommitConfig | undefined
): string {
  if (config?.rules) {
    for (const rule of config.rules) {
      const globs = normalizeRulePaths(rule.paths);
      if (!globs.some((glob) => pathMatchesGlob(path, glob))) {
        continue;
      }
      const sliceBase = globs[0]!;
      const literal = rule.name?.literal;
      if (literal !== undefined) {
        return `${sliceBase}\0${literal}`;
      }
      const name = resolveName(rule.name, [path]);
      if (name !== undefined) {
        return `${sliceBase}\0${name}`;
      }
      return sliceBase;
    }
  }
  return path.includes("/") ? (path.split("/")[0] ?? path) : path;
}

export function expandMessage(message: string, vars: MessageVars): string {
  let out = message;
  if (vars.name !== undefined) {
    out = out.replaceAll("{{name}}", vars.name);
  }
  if (vars.type !== undefined) {
    out = out.replaceAll("{{type}}", vars.type);
  }
  if (vars.scope !== undefined) {
    out = out.replaceAll("{{scope}}", vars.scope);
  }
  out = out.replaceAll("{{summary}}", vars.summary);
  return out;
}

export function pathMatchesGlob(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path);
}

function matchRule(
  rule: CommitRule,
  stagedPaths: string[],
  defaultWhen: CommitRule["when"] | undefined
): ConfigMatch | undefined {
  const when = rule.when ?? defaultWhen ?? "any";
  const globs = normalizeRulePaths(rule.paths);
  const matchesPath = (path: string): boolean =>
    globs.some((glob) => pathMatchesGlob(path, glob));
  const matchingPaths = stagedPaths.filter(matchesPath);

  if (when === "all") {
    if (matchingPaths.length !== stagedPaths.length) {
      return undefined;
    }
  } else if (matchingPaths.length === 0) {
    return undefined;
  }

  const needsName = rule.message.includes("{{name}}");
  const name = resolveName(rule.name, matchingPaths);
  if (needsName && name === undefined) {
    return undefined;
  }

  return { message: rule.message, name };
}

function resolveName(
  name: CommitNameSource | undefined,
  matchingPaths: string[]
): string | undefined {
  if (name?.literal !== undefined) {
    return name.literal;
  }

  if (name?.segment === undefined) {
    return undefined;
  }

  const counts = new Map<string, number>();
  for (const path of matchingPaths) {
    const segment = path.split("/")[name.segment];
    if (segment === undefined || segment === "") {
      continue;
    }
    const value = segment.toLowerCase();
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return undefined;
  }

  let best = "";
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best === "" ? undefined : best;
}

function globToRegExp(glob: string): RegExp {
  let cached = globCache.get(glob);
  if (cached) {
    return cached;
  }
  let re = "^";
  for (let i = 0; i < glob.length; ) {
    const c = glob[i]!;
    if (c === "*") {
      if (glob[i + 1] === "*") {
        if (glob[i + 2] === "/") {
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
  cached = new RegExp(re);
  globCache.set(glob, cached);
  return cached;
}

function escapeRegExp(char: string): string {
  return char.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
}
