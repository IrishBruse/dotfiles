import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

export interface LintContext {
  filePath: string;
  skillRoot: string;
  relativeFiles: Set<string>;
  /** Populated when linting SKILL.md for orphan-reference checks. */
  skillMdContent?: string;
  /** Relative path -> content for all markdown in the skill folder. */
  markdownContents: Map<string, string>;
}

export function resolveSkillRelativePath(
  fromRelative: string,
  target: string
): string | undefined {
  const withoutFragment = target.split("#")[0]?.split("?")[0]?.trim() ?? "";
  if (withoutFragment === "") return undefined;
  if (/^[a-z]+:/i.test(withoutFragment)) return undefined;

  const resolved = path
    .normalize(path.join(path.dirname(fromRelative), withoutFragment))
    .split(path.sep)
    .join("/");
  return resolved;
}

export function resolveRelativeLink(
  fromFile: string,
  target: string
): string | undefined {
  const withoutFragment = target.split("#")[0]?.split("?")[0]?.trim() ?? "";
  if (withoutFragment === "") return undefined;
  if (/^[a-z]+:/i.test(withoutFragment)) return undefined;

  const skillRoot = findSkillRoot(fromFile);
  const resolved = path.normalize(
    path.join(path.dirname(fromFile), withoutFragment)
  );
  if (!resolved.startsWith(skillRoot)) return undefined;
  return path.relative(skillRoot, resolved).split(path.sep).join("/");
}

function skillRootForFile(filePath: string): string | undefined {
  let dir = path.dirname(filePath);
  while (true) {
    const skillMd = path.join(dir, "SKILL.md");
    if (existsSync(skillMd)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

function findSkillRoot(filePath: string): string {
  return skillRootForFile(filePath) ?? path.dirname(filePath);
}

export function skillRootFromPath(filePath: string): string | undefined {
  return skillRootForFile(filePath);
}

async function walkSkillFiles(
  dir: string,
  skillRoot: string,
  out: Set<string>
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const ent of entries) {
    const filePath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walkSkillFiles(filePath, skillRoot, out);
    } else if (ent.isFile()) {
      out.add(path.relative(skillRoot, filePath).split(path.sep).join("/"));
    }
  }
}

export async function buildLintContexts(
  files: string[]
): Promise<Map<string, LintContext>> {
  const skillRoots = new Map<string, Set<string>>();

  for (const filePath of files) {
    const skillRoot = skillRootFromPath(filePath);
    if (!skillRoot) continue;
    const existing = skillRoots.get(skillRoot);
    if (existing) {
      existing.add(filePath);
    } else {
      skillRoots.set(skillRoot, new Set([filePath]));
    }
  }

  const contexts = new Map<string, LintContext>();

  for (const [skillRoot, skillFiles] of skillRoots) {
    const relativeFiles = new Set<string>();
    await walkSkillFiles(skillRoot, skillRoot, relativeFiles);

    const markdownContents = new Map<string, string>();
    const { readFile } = await import("node:fs/promises");
    for (const relative of relativeFiles) {
      if (!/\.(?:md|mdc)$/i.test(relative)) continue;
      markdownContents.set(
        relative,
        await readFile(path.join(skillRoot, relative), "utf8")
      );
    }

    const skillMdContent = markdownContents.get("SKILL.md");

    for (const filePath of skillFiles) {
      contexts.set(filePath, {
        filePath,
        skillRoot,
        relativeFiles,
        skillMdContent,
        markdownContents,
      });
    }
  }

  return contexts;
}

export function filePathFromContext(
  filePathOrContext?: string | LintContext
): string | undefined {
  if (filePathOrContext === undefined) return undefined;
  if (typeof filePathOrContext === "string") return filePathOrContext;
  return filePathOrContext.filePath;
}

export function contextFromArg(
  filePathOrContext?: string | LintContext
): LintContext | undefined {
  if (filePathOrContext === undefined || typeof filePathOrContext === "string") {
    return undefined;
  }
  return filePathOrContext;
}
