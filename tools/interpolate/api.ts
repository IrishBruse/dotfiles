import { printInterpolationErrors } from "./errors.ts";
import { expandNamedPrompt } from "./expand.ts";
import { promptPath, resolvePromptsDir } from "./promptsDir.ts";

/**
 * Load and expand a named prompt template to markdown.
 *
 * Resolves `{{placeholders}}`, built-in vars, `{{env:NAME}}`, line conditions,
 * and shell snippets in fenced or inline command blocks. Prompts live under the
 * default library (`~/.config/interpolate/<name>.md`). Prints errors to stderr
 * and throws when expansion fails.
 *
 * @param name Prompt name without `.md` (e.g. `pr-create` for `pr-create.md`).
 * @return Expanded markdown with all template features applied.
 */
export function interpolate(name: string): string {
  const promptsDir = resolvePromptsDir(undefined);
  const result = expandNamedPrompt(name);
  if (result.ok === false) {
    printInterpolationErrors(promptPath(promptsDir, name), result.errors);
    throw new Error(`interpolate: failed to expand prompt "${name}"`);
  }
  return result.text;
}
