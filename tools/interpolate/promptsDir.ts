import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DEFAULT_PROMPTS_DIR = path.join(
  os.homedir(),
  ".config",
  "interpolate",
);

export function resolvePromptsDir(flagValue: string | undefined): string {
  return flagValue ?? DEFAULT_PROMPTS_DIR;
}

export function listPromptNames(promptsDir: string): string[] {
  if (!fs.existsSync(promptsDir)) {
    return [];
  }
  return fs
    .readdirSync(promptsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name.slice(0, -".md".length))
    .sort();
}

export function promptPath(promptsDir: string, name: string): string {
  return path.join(promptsDir, `${name}.md`);
}

export function loadPromptTemplate(promptsDir: string, name: string): string {
  const file = promptPath(promptsDir, name);
  if (!fs.existsSync(file)) {
    const known = listPromptNames(promptsDir);
    const hint =
      known.length > 0 ? ` Known prompts: ${known.join(", ")}.` : "";
    throw new Error(`no prompt "${name}" at ${file}.${hint}`);
  }
  return fs.readFileSync(file, "utf8");
}
