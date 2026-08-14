import { access, readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import {
  globalSkillRootSuffixes,
  projectSkillRootSuffixes,
} from "./skill-roots.ts";

const MARKDOWN = /\.(md|mdc)$/i;

export type SkillScope = "global" | "project";

export interface SkillDiscoveryOptions {
  includeCursorBuiltin?: boolean;
}

export interface SkillRoot {
  scope: SkillScope;
  path: string;
}

export interface SkillEntry {
  scope: SkillScope;
  root: string;
  name: string;
  skillPath: string;
}

function skillRootSuffixes(
  scope: "global" | "project",
  options: SkillDiscoveryOptions = {}
): readonly (readonly string[])[] {
  return scope === "global"
    ? globalSkillRootSuffixes(options)
    : projectSkillRootSuffixes(options);
}

export function skillRootPath(baseDir: string, suffix: readonly string[]): string {
  return path.join(baseDir, ...suffix);
}

export function globalSkillRoots(
  options: SkillDiscoveryOptions = {}
): SkillRoot[] {
  const home = homedir();
  return skillRootSuffixes("global", options).map((suffix) => ({
    scope: "global",
    path: skillRootPath(home, suffix),
  }));
}

export function projectSkillRoots(
  startDir: string,
  options: SkillDiscoveryOptions = {}
): SkillRoot[] {
  const roots: SkillRoot[] = [];
  const seen = new Set<string>();
  let dir = path.resolve(startDir);

  while (true) {
    for (const suffix of skillRootSuffixes("project", options)) {
      const rootPath = skillRootPath(dir, suffix);
      if (seen.has(rootPath)) continue;
      seen.add(rootPath);
      roots.push({ scope: "project", path: rootPath });
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return roots;
}

export function allSkillRoots(
  cwd: string,
  options: SkillDiscoveryOptions = {}
): SkillRoot[] {
  return [...globalSkillRoots(options), ...projectSkillRoots(cwd, options)];
}

export function defaultSkillRoots(
  options: SkillDiscoveryOptions = {}
): string[] {
  return globalSkillRoots(options).map((root) => root.path);
}

export function displayPath(filePath: string): string {
  const home = homedir();
  if (filePath === home) return "~";
  const prefix = `${home}${path.sep}`;
  if (filePath.startsWith(prefix)) {
    return `~${path.sep}${filePath.slice(prefix.length)}`;
  }
  return filePath;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw err;
  }
}

async function resolveRealPath(target: string): Promise<string | undefined> {
  try {
    return await realpath(target);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return undefined;
    throw err;
  }
}

async function isWalkableDir(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return false;
    throw err;
  }
}

/** Path of a skill package relative to its discovery root, using `/`. */
export function skillRelativeName(rootPath: string, skillDir: string): string {
  const relative = path.relative(rootPath, skillDir);
  if (!relative || relative === ".") return path.basename(skillDir);
  return relative.split(path.sep).join("/");
}

function isSameOrNestedPath(inner: string, outer: string): boolean {
  return inner === outer || inner.startsWith(`${outer}${path.sep}`);
}

/**
 * Drop roots whose real path is the same as, or nested under, an earlier root.
 * Keeps `~/.agents/skills` and skips `~/.cursor/skills` when it links into `gp/`.
 */
export async function dedupeSkillRoots(roots: SkillRoot[]): Promise<SkillRoot[]> {
  const kept: { root: SkillRoot; real: string }[] = [];

  for (const root of roots) {
    if (!(await pathExists(root.path))) continue;
    const real = (await resolveRealPath(root.path)) ?? path.resolve(root.path);

    if (kept.some((entry) => isSameOrNestedPath(real, entry.real))) {
      continue;
    }

    for (let index = kept.length - 1; index >= 0; index--) {
      if (isSameOrNestedPath(kept[index]!.real, real)) {
        kept.splice(index, 1);
      }
    }

    kept.push({ root, real });
  }

  return kept.map((entry) => entry.root);
}

/**
 * Recursively find skill packages under a root.
 * A skill is a directory that contains `SKILL.md`. Category folders are
 * organizational only and may nest skills (Cursor walks the same way).
 * Once a skill package is found, its children are not scanned.
 * Directory symlinks are followed, with cycle detection via real paths.
 */
export async function discoverSkillsInRoot(
  root: SkillRoot
): Promise<SkillEntry[]> {
  if (!(await pathExists(root.path))) return [];

  const skills: SkillEntry[] = [];
  const seenDirs = new Set<string>();
  await walkSkillPackages(root.path, root, skills, seenDirs);
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

async function walkSkillPackages(
  dir: string,
  root: SkillRoot,
  out: SkillEntry[],
  seenDirs: Set<string>
): Promise<void> {
  const realDir = await resolveRealPath(dir);
  if (realDir !== undefined) {
    if (seenDirs.has(realDir)) return;
    seenDirs.add(realDir);
  }

  const skillPath = path.join(dir, "SKILL.md");
  if (dir !== root.path && (await pathExists(skillPath))) {
    out.push({
      scope: root.scope,
      root: root.path,
      name: skillRelativeName(root.path, dir),
      skillPath,
    });
    return;
  }

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw err;
  }

  for (const ent of entries) {
    if (ent.name.startsWith(".")) continue;
    const child = path.join(dir, ent.name);
    if (!(await isWalkableDir(child))) continue;
    await walkSkillPackages(child, root, out, seenDirs);
  }
}

export async function discoverSkills(roots: SkillRoot[]): Promise<SkillEntry[]> {
  const skills: SkillEntry[] = [];
  const seen = new Set<string>();

  for (const root of await dedupeSkillRoots(roots)) {
    for (const skill of await discoverSkillsInRoot(root)) {
      const key =
        (await resolveRealPath(skill.skillPath)) ?? path.resolve(skill.skillPath);
      if (seen.has(key)) continue;
      seen.add(key);
      skills.push(skill);
    }
  }

  return skills;
}

async function walkMarkdownFiles(dir: string, out: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    throw err;
  }

  for (const ent of entries) {
    const filePath = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walkMarkdownFiles(filePath, out);
    } else if (ent.isFile() && MARKDOWN.test(ent.name)) {
      out.push(filePath);
    }
  }
}

export async function discoverSkillFiles(roots: string[]): Promise<string[]> {
  const files: string[] = [];
  for (const root of roots) {
    await walkMarkdownFiles(root, files);
  }
  return [...new Set(files)].sort();
}

export async function resolveLintScopes(targets: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const target of targets) {
    const resolved = path.resolve(target);
    const info = await stat(resolved);

    if (info.isDirectory()) {
      await walkMarkdownFiles(resolved, files);
      continue;
    }

    if (!isMarkdownPath(resolved)) {
      throw new Error(`${displayPath(resolved)}: not a markdown file or directory`);
    }

    await walkMarkdownFiles(path.dirname(resolved), files);
  }

  return [...new Set(files)].sort();
}

export function isMarkdownPath(filePath: string): boolean {
  return MARKDOWN.test(filePath);
}
