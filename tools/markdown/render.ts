import { body, border, codeBlockStyle, headingFg, reset } from "./colors.ts";
import { renderInline } from "./inline.ts";

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "table"; rows: string[][] }
  | { kind: "code"; lines: string[] }
  | { kind: "hr" };

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

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      i++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading !== null) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2]
      });
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? "").trim().startsWith("```")) {
        codeLines.push(lines[i] ?? "");
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: "code", lines: codeLines });
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1] ?? "")) {
      const rows: string[][] = [parseTableRow(line)];
      i += 2;
      while (i < lines.length && isTableRow(lines[i] ?? "")) {
        rows.push(parseTableRow(lines[i] ?? ""));
        i++;
      }
      blocks.push({ kind: "table", rows });
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
      blocks.push({ kind: "ul", items });
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
      blocks.push({ kind: "ol", items });
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
    blocks.push({ kind: "paragraph", lines: paraLines });
  }

  return blocks;
}

function columnWidths(rows: string[][]): number[] {
  const cols = Math.max(0, ...rows.map((r) => r.length));
  const widths: number[] = [];
  for (let c = 0; c < cols; c++) {
    widths[c] = Math.max(1, ...rows.map((r) => (r[c] ?? "").length));
  }
  return widths;
}

function padCell(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - text.length));
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

function renderTable(rows: string[][]): string {
  if (rows.length === 0) return "";

  const widths = columnWidths(rows);
  const hLine = () =>
    `${border}+${widths.map((w) => "-".repeat(w + 2)).join("+")}+${reset}`;

  const rowLine = (cells: string[]) => {
    const parts = widths.map((w, c) => {
      const raw = padCell(cells[c] ?? "", w);
      return ` ${body}${renderInline(raw)}${reset} `;
    });
    return `${border}|${reset}${parts.join(`${border}|${reset}`)}${border}|${reset}`;
  };

  const [head, ...bodyRows] = rows;
  const out: string[] = [rowLine(head ?? []), hLine()];
  for (const row of bodyRows) out.push(rowLine(row));
  return out.join("\n");
}

function renderBlock(block: Block): string {
  switch (block.kind) {
    case "heading":
      return `${headingFg(block.level)}${renderInline(block.text)}${reset}`;
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
      return renderTable(block.rows);
    case "code":
      return block.lines
        .map((l) => `${codeBlockStyle}${fillLine(l)}${reset}`)
        .join("\n");
    case "hr":
      return `${border}${"─".repeat(40)}${reset}`;
  }
}

export function renderMarkdown(source: string): string {
  const blocks = parseBlocks(source);
  const parts: string[] = [];
  let prev: Block["kind"] | null = null;

  for (const block of blocks) {
    if (parts.length > 0 && prev !== null) parts.push("");
    parts.push(renderBlock(block));
    prev = block.kind;
  }

  return parts.join("\n");
}
