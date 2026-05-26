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
