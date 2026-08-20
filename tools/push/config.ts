import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import type { Change, Slice } from "./git.ts";

export interface Rule {
  globs: string[];
  prefix: string;
  scope?: string;
}

export function loadRules(repoRoot: string): Rule[] {
  const file = join(repoRoot, "commit.config.json");
  if (!existsSync(file)) {
    return [];
  }
  const raw = JSON.parse(readFileSync(file, "utf8")) as {
    rules?: Array<{ paths?: string | string[]; prefix?: string; scope?: string }>;
  };
  const rules: Rule[] = [];
  for (const entry of raw.rules ?? []) {
    if (typeof entry.prefix !== "string" || entry.prefix === "") {
      continue;
    }
    const paths = Array.isArray(entry.paths) ? entry.paths : [entry.paths];
    const globs = paths.filter((p): p is string => typeof p === "string" && p !== "");
    if (globs.length === 0) {
      continue;
    }
    const rule: Rule = { globs, prefix: entry.prefix };
    if (typeof entry.scope === "string" && entry.scope !== "") {
      rule.scope = entry.scope;
    }
    rules.push(rule);
  }
  return rules;
}

export function planSlices(changes: Change[], rules: Rule[]): Slice[] {
  const groups = new Map<string, Change[]>();
  for (const change of changes) {
    const key = groupKey(change.path, rules);
    const list = groups.get(key) ?? [];
    list.push(change);
    groups.set(key, list);
  }

  return [...groups.values()].map((files) => {
    const hit = matchRules(files[0]!.path, rules);
    return {
      paths: files.map((f) => f.path),
      previousPaths: files.flatMap((f) => (f.previousPath ? [f.previousPath] : [])),
      message: formatSubject(hit, files)
    };
  });
}

export function matchGlob(
  path: string,
  pattern: string
): { matched: boolean; scope?: string } {
  const compiled = compile(pattern);
  const match = compiled.re.exec(path);
  if (!match) {
    return { matched: false };
  }
  const scope =
    compiled.scopeGroup === undefined ? undefined : match[compiled.scopeGroup];
  return scope ? { matched: true, scope: scope.toLowerCase() } : { matched: true };
}

function groupKey(path: string, rules: Rule[]): string {
  const hit = matchRules(path, rules);
  if (!hit) {
    return `misc\0${path.split("/")[0] ?? path}`;
  }
  const scope = hit.rule.scope ?? hit.scope ?? "";
  return `${hit.rule.prefix}\0${scope}`;
}

function matchRules(
  path: string,
  rules: Rule[]
): { rule: Rule; scope?: string } | undefined {
  for (const rule of rules) {
    for (const glob of rule.globs) {
      const result = matchGlob(path, glob);
      if (result.matched) {
        return { rule, scope: result.scope };
      }
    }
  }
  return undefined;
}

function formatSubject(
  hit: { rule: Rule; scope?: string } | undefined,
  files: Change[]
): string {
  const prefix = hit?.rule.prefix ?? "misc";
  const scope = hit?.rule.scope ?? hit?.scope;
  const summary = summarize(files, scope);
  return scope ? `${prefix}(${scope}): ${summary}` : `${prefix}: ${summary}`;
}

function summarize(files: Change[], scope: string | undefined): string {
  if (files.every((f) => f.status === "D")) {
    return scope ? `remove ${scope} files` : "remove files";
  }
  if (files.every((f) => basename(f.path) === "SKILL.md")) {
    return "document rule workflow";
  }
  if (files.length === 1) {
    return `update ${basename(files[0]!.path)}`;
  }
  return scope ? `update ${scope}` : `update ${String(files.length)} files`;
}

function compile(pattern: string): { re: RegExp; scopeGroup?: number } {
  let re = "^";
  let scopeGroup: number | undefined;
  let groups = 0;
  for (let i = 0; i < pattern.length; ) {
    if (pattern.startsWith(":scope", i)) {
      const end = i + 6;
      if (end === pattern.length || pattern[end] === "/") {
        groups += 1;
        scopeGroup = groups;
        re += "([^/]+)";
        i = end;
        continue;
      }
    }
    if (pattern.startsWith("**/", i)) {
      re += "(?:.*/)?";
      i += 3;
      continue;
    }
    if (pattern[i] === "*" && pattern[i + 1] === "*") {
      re += ".*";
      i += 2;
      continue;
    }
    if (pattern[i] === "*") {
      re += "[^/]*";
      i += 1;
      continue;
    }
    re += escapeRe(pattern[i]!);
    i += 1;
  }
  return { re: new RegExp(`${re}$`), scopeGroup };
}

function escapeRe(char: string): string {
  return char.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
}
