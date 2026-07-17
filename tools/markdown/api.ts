import { renderMarkdown } from "./render.ts";

/**
 * Render CommonMark-style markdown as ANSI text for a terminal.
 *
 * YAML frontmatter at file start, headings, paragraphs, lists, tables, blockquotes,
 * rules, and fenced or indented code blocks are styled for TTY output. Inline
 * emphasis, code spans, and links (including OSC 8 click targets) are supported.
 *
 * @param source Raw markdown source text.
 * @return ANSI escape sequences and visible text, suitable for `process.stdout`.
 */
export function markdown(source: string): string {
  return renderMarkdown(source);
}
