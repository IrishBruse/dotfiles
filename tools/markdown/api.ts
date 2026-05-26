/**
 * Public surface for `tools/markdown`. Other tool folders import from here only.
 */

import {
  collectLinkRefs as collectLinkRefsImpl,
  parseBlocks as parseBlocksImpl,
  renderBlock as renderBlockImpl,
  renderMarkdown as renderMarkdownImpl,
  renderMarkdownChunks as renderMarkdownChunksImpl,
  writeMarkdown as writeMarkdownImpl
} from "./render.ts";

/** Reference targets from `[id]: url` lines (GFM, case-insensitive keys). */
export type LinkRefs = Map<string, string>;

export type ListItem = { text: string; children: ListItem[] };

type BlockquoteLine = { depth: number; text: string };

type ColumnAlign = "left" | "center" | "right";

/** Parsed markdown block (headings, lists, tables, code fences, ...). */
export type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul"; items: ListItem[] }
  | { kind: "ol"; items: ListItem[] }
  | { kind: "table"; rows: string[][]; align: ColumnAlign[] }
  | { kind: "blockquote"; lines: BlockquoteLine[] }
  | { kind: "code"; lines: string[]; command?: string }
  | { kind: "hr" };

/** Scan markdown for `[label]: url` reference definitions. */
export function collectLinkRefs(source: string): LinkRefs {
  return collectLinkRefsImpl(source);
}

/** Yield parsed blocks from `source`. */
export function parseBlocks(
  source: string,
  refs?: LinkRefs
): Generator<Block> {
  return parseBlocksImpl(source, refs);
}

/** ANSI-render a single parsed block. */
export function renderBlock(block: Block, refs: LinkRefs): string {
  return renderBlockImpl(block, refs);
}

/** Render full markdown source to one ANSI string. */
export function renderMarkdown(source: string): string {
  return renderMarkdownImpl(source);
}

/** Yield ANSI output block-by-block (blank line inserted between blocks). */
export function* renderMarkdownChunks(source: string): Generator<string> {
  yield* renderMarkdownChunksImpl(source);
}

/** Stream ANSI-rendered markdown to `out` (default stdout). */
export function writeMarkdown(
  source: string,
  out?: NodeJS.WriteStream
): void {
  writeMarkdownImpl(source, out);
}
