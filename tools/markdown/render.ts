import {
  body,
  border,
  codeBlockGhostStyle,
  codeBlockStyle,
  headingFg,
  reset
} from "./colors.ts";
import {
  collectLinkRefs,
  isLinkRefDefLine,
  type LinkRefs
} from "./links.ts";
import { plainInlineLength, renderInline } from "./inline.ts";

export { collectLinkRefs, type LinkRefs };

type ColumnAlign = "left" | "center" | "right";

export type ListItem = { text: string; children: ListItem[] };

type BlockquoteLine = { depth: number; text: string };

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul"; items: ListItem[] }
  | { kind: "ol"; items: ListItem[] }
  | { kind: "table"; rows: string[][]; align: ColumnAlign[] }
  | { kind: "blockquote"; lines: BlockquoteLine[] }
  | { kind: "code"; lines: string[]; command?: string }
  | { kind: "hr" };

/** ` ```!cmd ` or ` ```lang !cmd ` (matches interpolate command fences). */
function parseCommandFenceOpener(opener: string): string | undefined {
  const bang = opener.indexOf("!");
  if (bang === -1) return undefined;
  const cmd = opener.slice(bang + 1).trim();
  if (cmd === "") return undefined;
  if (bang > 0 && opener[bang - 1] !== " ") return undefined;
  return cmd;
}

const embeddedCommandLine = /^! (.+)$/;

function resolveCodeBlock(commandFromOpener: string | undefined, lines: string[]): {
  command?: string;
  lines: string[];
} {
  const embedded = (lines[0] ?? "").match(embeddedCommandLine);
  if (embedded !== null) {
    const cmd = embedded[1];
    const rest = lines.slice(1);
    if (commandFromOpener === undefined) {
      return { command: cmd, lines: rest };
    }
    if (commandFromOpener === cmd) {
      return { command: commandFromOpener, lines: rest };
    }
  }
  if (commandFromOpener !== undefined) {
    return { command: commandFromOpener, lines };
  }
  return { lines };
}

function isTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|");
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.startsWith("|")) return false;
  return /^\|[\s:|-]+\|$/.test(t);
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

function parseTableAlignment(cell: string): ColumnAlign {
  const t = cell.trim();
  const hasLeft = t.startsWith(":");
  const hasRight = t.endsWith(":");
  if (hasLeft && hasRight) return "center";
  if (hasRight) return "right";
  return "left";
}

function parseTableAlignments(separatorLine: string): ColumnAlign[] {
  return parseTableRow(separatorLine).map(parseTableAlignment);
}

function isUlLine(line: string): boolean {
  return /^\s*[-*+]\s+/.test(line);
}

function isOlLine(line: string): boolean {
  return /^\s*\d+\.\s+/.test(line);
}

function buildListTree(entries: { indent: number; text: string }[]): ListItem[] {
  const root: ListItem[] = [];
  const stack: { indent: number; item: ListItem }[] = [];

  for (const { indent, text } of entries) {
    const item: ListItem = { text, children: [] };
    while (stack.length > 0 && (stack.at(-1)?.indent ?? 0) >= indent) {
      stack.pop();
    }
    const parent = stack.at(-1);
    if (parent === undefined) {
      root.push(item);
    } else {
      parent.item.children.push(item);
    }
    stack.push({ indent, item });
  }
  return root;
}

function parseUlLines(lines: string[]): ListItem[] {
  const entries: { indent: number; text: string }[] = [];
  for (const line of lines) {
    const m = /^(\s*)[-*+]\s+(.+)$/.exec(line);
    if (m === null) break;
    entries.push({ indent: m[1].length, text: m[2] });
  }
  return buildListTree(entries);
}

function parseOlLines(lines: string[]): ListItem[] {
  const entries: { indent: number; text: string }[] = [];
  for (const line of lines) {
    const m = /^(\s*)(\d+)\.\s+(.+)$/.exec(line);
    if (m === null) break;
    entries.push({ indent: m[1].length, text: m[3] });
  }
  return buildListTree(entries);
}

function isBlockquoteLine(line: string): boolean {
  return /^\s*>/.test(line);
}

function parseBlockquoteLine(line: string): BlockquoteLine {
  let pos = 0;
  let depth = 0;
  while (pos < line.length) {
    const m = /^>\s?/.exec(line.slice(pos));
    if (m === null) break;
    depth++;
    pos += m[0].length;
  }
  return { depth: Math.max(0, depth - 1), text: line.slice(pos) };
}

function isIndentedCodeLine(line: string): boolean {
  return /^(?: {4}|\t)/.test(line);
}

function stripCodeIndent(line: string): string {
  if (line.startsWith("\t")) return line.slice(1);
  return line.slice(4);
}

export function* parseBlocks(
  source: string,
  refs: LinkRefs = collectLinkRefs(source)
): Generator<Block> {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      i++;
      continue;
    }

    if (isLinkRefDefLine(line)) {
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      yield { kind: "hr" };
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading !== null) {
      yield {
        kind: "heading",
        level: heading[1].length,
        text: heading[2]
      };
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const commandFromOpener = parseCommandFenceOpener(trimmed.slice(3).trim());
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      if (i < lines.length) i++;
      const resolved = resolveCodeBlock(commandFromOpener, codeLines);
      yield {
        kind: "code",
        lines: resolved.lines,
        command: resolved.command
      };
      continue;
    }

    if (isIndentedCodeLine(line)) {
      const codeLines: string[] = [];
      while (i < lines.length && isIndentedCodeLine(lines[i] ?? "")) {
        codeLines.push(stripCodeIndent(lines[i] ?? ""));
        i++;
      }
      yield { kind: "code", lines: codeLines };
      continue;
    }

    if (isBlockquoteLine(line)) {
      const quoteLines: BlockquoteLine[] = [parseBlockquoteLine(line)];
      i++;
      while (i < lines.length && isBlockquoteLine(lines[i] ?? "")) {
        quoteLines.push(parseBlockquoteLine(lines[i] ?? ""));
        i++;
      }
      yield { kind: "blockquote", lines: quoteLines };
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1] ?? "")) {
      const rows: string[][] = [parseTableRow(line)];
      const align = parseTableAlignments(lines[i + 1] ?? "");
      i += 2;
      while (i < lines.length && isTableRow(lines[i] ?? "")) {
        rows.push(parseTableRow(lines[i] ?? ""));
        i++;
      }
      yield { kind: "table", rows, align };
      continue;
    }

    if (isUlLine(line)) {
      const listLines: string[] = [line];
      i++;
      while (i < lines.length && isUlLine(lines[i] ?? "")) {
        listLines.push(lines[i] ?? "");
        i++;
      }
      yield { kind: "ul", items: parseUlLines(listLines) };
      continue;
    }

    if (isOlLine(line)) {
      const listLines: string[] = [line];
      i++;
      while (i < lines.length && isOlLine(lines[i] ?? "")) {
        listLines.push(lines[i] ?? "");
        i++;
      }
      yield { kind: "ol", items: parseOlLines(listLines) };
      continue;
    }

    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i] ?? "";
      const nextTrim = next.trim();
      if (nextTrim.length === 0) break;
      if (/^#{1,6}\s/.test(nextTrim)) break;
      if (isTableRow(next)) break;
      if (isUlLine(next)) break;
      if (isOlLine(next)) break;
      if (isBlockquoteLine(next)) break;
      if (isIndentedCodeLine(next)) break;
      if (nextTrim.startsWith("```")) break;
      paraLines.push(next);
      i++;
    }
    yield { kind: "paragraph", lines: paraLines };
  }
}

function columnWidths(rows: string[][], refs: LinkRefs): number[] {
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(
      1,
      ...rows.map((r) => plainInlineLength(r[c] ?? "", refs))
    );
  }
  return widths;
}

function cellPadding(
  raw: string,
  width: number,
  align: ColumnAlign,
  refs: LinkRefs
): { left: string; right: string } {
  const pad = Math.max(0, width - plainInlineLength(raw, refs));
  if (align === "right") {
    return { left: " ".repeat(pad), right: "" };
  }
  if (align === "center") {
    const left = Math.floor(pad / 2);
    return { left: " ".repeat(left), right: " ".repeat(pad - left) };
  }
  return { left: "", right: " ".repeat(pad) };
}

function terminalColumns(): number {
  const cols = process.stdout.columns;
  if (typeof cols === "number" && cols > 0) return cols;
  return 80;
}

/** Pad with spaces so background fills the terminal row. */
function fillLine(text: string): string {
  const width = terminalColumns();
  if (text.length >= width) return text;
  return text + " ".repeat(width - text.length);
}

function tableBorderLine(
  corners: { left: string; mid: string; right: string },
  widths: number[]
): string {
  const segment = (w: number) => `${border}${"─".repeat(w + 2)}${reset}`;
  let line = `${border}${corners.left}${reset}`;
  for (let i = 0; i < widths.length; i++) {
    line += segment(widths[i] ?? 0);
    if (i < widths.length - 1) {
      line += `${border}${corners.mid}${reset}`;
    }
  }
  return `${line}${border}${corners.right}${reset}`;
}

function renderTable(
  rows: string[][],
  align: ColumnAlign[],
  refs: LinkRefs
): string {
  if (rows.length === 0) return "";

  const widths = columnWidths(rows, refs);
  const vBar = `${border}│${reset}`;

  const rowLine = (cells: string[]) => {
    const parts = widths.map((w, c) => {
      const raw = cells[c] ?? "";
      const { left, right } = cellPadding(raw, w, align[c] ?? "left", refs);
      return ` ${left}${body}${renderInline(raw, body, refs)}${right}${reset} `;
    });
    return `${vBar}${parts.join(vBar)}${vBar}`;
  };

  const [head, ...bodyRows] = rows;
  const out: string[] = [
    tableBorderLine({ left: "┌", mid: "┬", right: "┐" }, widths),
    rowLine(head ?? []),
    tableBorderLine({ left: "├", mid: "┼", right: "┤" }, widths)
  ];
  for (const row of bodyRows) out.push(rowLine(row));
  out.push(tableBorderLine({ left: "└", mid: "┴", right: "┘" }, widths));
  return out.join("\n");
}

function renderParagraphLines(lines: string[], refs: LinkRefs): string {
  const parts: string[] = [];
  for (let n = 0; n < lines.length; n++) {
    parts.push(`${body}${renderInline(lines[n] ?? "", body, refs)}${reset}`);
    if (n < lines.length - 1) {
      parts.push((lines[n] ?? "").endsWith("  ") ? "\n" : " ");
    }
  }
  return parts.join("");
}

function renderBlockquoteLine(
  line: BlockquoteLine,
  refs: LinkRefs
): string {
  const prefix = `${border}${"  ".repeat(line.depth)}▌ ${reset}`;
  const heading = /^(#{1,6})\s+(.+)$/.exec(line.text);
  if (heading !== null) {
    const hFg = headingFg(heading[1].length);
    return `${prefix}${hFg}${renderInline(heading[2], hFg, refs)}${reset}`;
  }
  return `${prefix}${body}${renderInline(line.text, body, refs)}${reset}`;
}

export function renderUlItems(
  items: ListItem[],
  refs: LinkRefs,
  depth = 0
): string {
  return items
    .map((item) => {
      const pad = "  ".repeat(depth + 1);
      const head = `${body}${pad}• ${renderInline(item.text, body, refs)}${reset}`;
      if (item.children.length === 0) return head;
      return `${head}\n${renderUlItems(item.children, refs, depth + 1)}`;
    })
    .join("\n");
}

function renderOlItems(
  items: ListItem[],
  refs: LinkRefs,
  depth = 0
): string {
  return items
    .map((item, n) => {
      const pad = "  ".repeat(depth + 1);
      const head = `${body}${pad}${n + 1}. ${renderInline(item.text, body, refs)}${reset}`;
      if (item.children.length === 0) return head;
      return `${head}\n${renderOlItems(item.children, refs, depth + 1)}`;
    })
    .join("\n");
}

export function renderBlock(block: Block, refs: LinkRefs): string {
  switch (block.kind) {
    case "heading": {
      const hFg = headingFg(block.level);
      return `${hFg}${renderInline(block.text, hFg, refs)}${reset}`;
    }
    case "paragraph":
      return renderParagraphLines(block.lines, refs);
    case "ul":
      return renderUlItems(block.items, refs);
    case "ol":
      return renderOlItems(block.items, refs);
    case "table":
      return renderTable(block.rows, block.align, refs);
    case "blockquote":
      return block.lines
        .map((l) => renderBlockquoteLine(l, refs))
        .join("\n");
    case "code": {
      const out: string[] = [];
      if (block.command !== undefined) {
        out.push(`${codeBlockGhostStyle}${fillLine(block.command)}${reset}`);
      }
      for (const l of block.lines) {
        out.push(`${codeBlockStyle}${fillLine(l)}${reset}`);
      }
      return out.join("\n");
    }
    case "hr":
      return `${border}${"─".repeat(40)}${reset}`;
  }
}

export function renderMarkdown(source: string): string {
  const parts: string[] = [];
  for (const chunk of renderMarkdownChunks(source)) {
    parts.push(chunk);
  }
  return parts.join("");
}

export function* renderMarkdownChunks(source: string): Generator<string> {
  const refs = collectLinkRefs(source);
  let prev: Block["kind"] | null = null;
  for (const block of parseBlocks(source, refs)) {
    if (prev !== null) yield "\n\n";
    yield renderBlock(block, refs);
    prev = block.kind;
  }
}

export function writeMarkdown(
  source: string,
  out: NodeJS.WriteStream = process.stdout
): void {
  for (const chunk of renderMarkdownChunks(source)) {
    out.write(chunk);
  }
}
