/**
 * Public surface for `tools/interpolate`. Other tool folders import from here only.
 */

import os from "node:os";
import path from "node:path";
import process from "node:process";

import { expandTemplate } from "./expand.ts";
import { printInterpolationErrors as printInterpolationErrorsImpl } from "./errors.ts";
import { loadPromptTemplate as loadPromptTemplateImpl } from "./promptsDir.ts";

export type InterpolationError = {
  line: number;
  column: number;
  message: string;
};

export type ExpandResult =
  | { ok: true; text: string }
  | { ok: false; errors: InterpolationError[] };

/** Default `~/.config/interpolate` prompts directory. */
export const DEFAULT_PROMPTS_DIR: string = path.join(
  os.homedir(),
  ".config",
  "interpolate"
);

/** Resolve prompts dir from CLI flag or {@link DEFAULT_PROMPTS_DIR}. */
export function resolvePromptsDir(flagValue: string | undefined): string {
  return flagValue ?? DEFAULT_PROMPTS_DIR;
}

/** Absolute path to `<promptsDir>/<name>.md`. */
export function promptPath(promptsDir: string, name: string): string {
  return path.join(promptsDir, `${name}.md`);
}

/** Read a named `.md` prompt; throws if missing. */
export function loadPromptTemplate(promptsDir: string, name: string): string {
  return loadPromptTemplateImpl(promptsDir, name);
}

/** Print interpolation errors to stderr (red, file:line:column). */
export function printInterpolationErrors(
  file: string,
  errors: InterpolationError[]
): void {
  printInterpolationErrorsImpl(file, errors);
}

export type ExpandNamedPromptOptions = {
  promptsDir?: string;
  /** Working directory for `{{cwd}}` and ```! shell blocks. */
  cwd?: string;
  vars?: Record<string, string>;
  /** Extra placeholder values merged after built-in vars. */
  builtinOverrides?: Record<string, string>;
};

/**
 * Load `name.md` from the prompts directory and expand placeholders + builtins + commands.
 */
export function expandNamedPrompt(
  name: string,
  options?: ExpandNamedPromptOptions
): ExpandResult {
  const promptsDir = resolvePromptsDir(options?.promptsDir);
  const template = loadPromptTemplate(promptsDir, name);
  const prevCwd = process.cwd();
  if (options?.cwd !== undefined) {
    process.chdir(options.cwd);
  }
  try {
    return expandTemplate(
      template,
      options?.vars ?? {},
      options?.builtinOverrides ?? {}
    );
  } finally {
    if (options?.cwd !== undefined) {
      process.chdir(prevCwd);
    }
  }
}
