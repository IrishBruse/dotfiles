import {
  DEFAULT_FALLBACK_MESSAGE,
  type CommitConfig,
  type CommitScopeRule
} from "./config.ts";
import type { CommitType } from "./analyze.ts";

export interface ConfigMatch {
  message: string;
  name?: string;
}

export interface MessageVars {
  summary: string;
  type?: CommitType;
  scope?: string;
  name?: string;
}

export function findConfigMatch(
  config: CommitConfig,
  stagedPaths: string[]
): ConfigMatch | undefined {
  if (stagedPaths.length === 0 || !config.scopes) {
    return undefined;
  }

  for (const [path, rule] of Object.entries(config.scopes)) {
    const match = matchScope(path, rule, stagedPaths);
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function resolveFallbackMessage(
  config: CommitConfig,
  vars: MessageVars
): string {
  const template = config.fallback?.message ?? DEFAULT_FALLBACK_MESSAGE;
  return expandMessage(template, vars);
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
  if (out.includes("{{summary}}")) {
    out = out.replaceAll("{{summary}}", vars.summary);
  }
  return out;
}

function matchScope(
  pathGlob: string,
  rule: CommitScopeRule,
  stagedPaths: string[]
): ConfigMatch | undefined {
  const when = rule.when ?? "any";
  const matcher = globToRegExp(pathGlob);
  const matchingPaths = stagedPaths.filter((path) => matcher.test(path));

  if (when === "all") {
    if (matchingPaths.length !== stagedPaths.length) {
      return undefined;
    }
  } else if (matchingPaths.length === 0) {
    return undefined;
  }

  const needsName = rule.message.includes("{{name}}");
  const name = resolveName(rule, matchingPaths);
  if (needsName && name === undefined) {
    return undefined;
  }

  return { message: rule.message, name };
}

function resolveName(
  rule: CommitScopeRule,
  matchingPaths: string[]
): string | undefined {
  if (typeof rule.name === "string") {
    return rule.name;
  }

  if (rule.name === undefined) {
    return undefined;
  }

  const counts = new Map<string, number>();
  for (const path of matchingPaths) {
    const segment = path.split("/")[rule.name];
    if (segment === undefined || segment === "") {
      continue;
    }
    const name = segment.toLowerCase();
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return undefined;
  }

  let best = "";
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name;
      bestCount = count;
    }
  }
  return best === "" ? undefined : best;
}

export function pathMatchesGlob(path: string, glob: string): boolean {
  return globToRegExp(glob).test(path);
}

function globToRegExp(glob: string): RegExp {
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
  return new RegExp(re);
}

function escapeRegExp(char: string): string {
  return char.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
}
