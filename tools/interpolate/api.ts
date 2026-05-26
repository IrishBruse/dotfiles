import process from "node:process";

import { expandTemplate, type ExpandResult } from "./expand.ts";
import {
  printInterpolationErrors,
  type InterpolationError
} from "./errors.ts";
import {
  DEFAULT_PROMPTS_DIR,
  loadPromptTemplate,
  promptPath,
  resolvePromptsDir
} from "./promptsDir.ts";

export {
  DEFAULT_PROMPTS_DIR,
  loadPromptTemplate,
  printInterpolationErrors,
  promptPath,
  resolvePromptsDir
};
export type { InterpolationError };
export type { ExpandResult };

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
