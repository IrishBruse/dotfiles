import {
  body,
  border,
  codeBlockGhostStyle,
  codeBlockStyle,
  headingFg,
  reset
} from "./colors.ts";
import { plainInlineLength, renderInline } from "./inline.ts";

type ColumnAlign = "left" | "center" | "right";

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; rows: string[][]; align: ColumnAlign[] }
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

export function* parseBlocks(source: string): Generator<Block> {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed.length === 0) {
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

    const ulMatch = /^[-*+]\s+(.+)$/.exec(trimmed);
    if (ulMatch !== null) {
      const items: string[] = [ulMatch[1]];
      i++;
      while (i < lines.length) {
        const m = /^[-*+]\s+(.+)$/.exec((lines[i] ?? "").trim());
        if (m === null) break;
        items.push(m[1]);
        i++;
      }
      yield { kind: "ul", items };
      continue;
    }

    const olMatch = /^(\d+)\.\s+(.+)$/.exec(trimmed);
    if (olMatch !== null) {
      const items: string[] = [olMatch[2]];
      i++;
      while (i < lines.length) {
        const m = /^(\d+)\.\s+(.+)$/.exec((lines[i] ?? "").trim());
        if (m === null) break;
        items.push(m[2]);
        i++;
      }
      yield { kind: "ol", items };
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
      if (/^[-*+]\s+/.test(nextTrim)) break;
      if (/^\d+\.\s+/.test(nextTrim)) break;
      if (nextTrim.startsWith("```")) break;
      paraLines.push(next);
      i++;
    }
    yield { kind: "paragraph", lines: paraLines };
  }
}

function columnWidths(rows: string[][]): number[] {
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(
      1,
      ...rows.map((r) => plainInlineLength(r[c] ?? ""))
    );
  }
  return widths;
}

function cellPadding(
  raw: string,
  width: number,
  align: ColumnAlign
): { left: string; right: string } {
  const pad = Math.max(0, width - plainInlineLength(raw));
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

function renderTable(rows: string[][], align: ColumnAlign[]): string {
  if (rows.length === 0) return "";

  const widths = columnWidths(rows);
  const vBar = `${border}│${reset}`;

  const rowLine = (cells: string[]) => {
    const parts = widths.map((w, c) => {
      const raw = cells[c] ?? "";
      const { left, right } = cellPadding(raw, w, align[c] ?? "left");
      return ` ${left}${body}${renderInline(raw)}${right}${reset} `;
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

export function renderBlock(block: Block): string {
  switch (block.kind) {
    case "heading": {
      const hFg = headingFg(block.level);
      return `${hFg}${renderInline(block.text, hFg)}${reset}`;
    }
    case "paragraph":
      return block.lines
        .map((l) => `${body}${renderInline(l)}${reset}`)
        .join("\n");
    case "ul":
      return block.items
        .map((item) => `${body}  • ${renderInline(item)}${reset}`)
        .join("\n");
    case "ol":
      return block.items
        .map((item, n) => `${body}  ${n + 1}. ${renderInline(item)}${reset}`)
        .join("\n");
    case "table":
      return renderTable(block.rows, block.align);
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
  let prev: Block["kind"] | null = null;
  for (const block of parseBlocks(source)) {
    if (prev !== null) yield "\n\n";
    yield renderBlock(block);
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
