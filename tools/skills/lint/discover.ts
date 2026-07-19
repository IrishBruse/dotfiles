import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const MARKDOWN = /\.(md|mdc)$/i;

export function defaultSkillRoots(): string[] {
  const home = homedir();
  return [
    path.join(home, ".agents", "skills"),
    path.join(home, ".cursor", "skills"),
    path.join(home, ".cursor", "skills-cursor"),
  ];
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

export function isMarkdownPath(filePath: string): boolean {
  return MARKDOWN.test(filePath);
}
