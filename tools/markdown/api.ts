/**
 * Public surface for `tools/markdown`. Other tool folders import from here only.
 */

import { renderMarkdown } from "./render.ts";

/** Render raw markdown to a terminal-ready string with ANSI escape codes. */
export function markdown(source: string): string {
  return renderMarkdown(source);
}
