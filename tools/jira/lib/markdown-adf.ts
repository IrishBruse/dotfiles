/**
 * Convert local ticket markdown descriptions to Jira ADF for acli writes.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

type AdfMark = { type: string; attrs?: Record<string, string> };

type AdfTextNode = {
  type: "text";
  text: string;
  marks?: AdfMark[];
};

type AdfHardBreak = { type: "hardBreak" };

type AdfInlineNode = AdfTextNode | AdfHardBreak;

type AdfParagraph = { type: "paragraph"; content: AdfInlineNode[] };

type AdfHeading = {
  type: "heading";
  attrs: { level: number };
  content: AdfTextNode[];
};

type AdfListItem = {
  type: "listItem";
  content: AdfParagraph[];
};

type AdfBulletList = { type: "bulletList"; content: AdfListItem[] };

type AdfOrderedList = { type: "orderedList"; content: AdfListItem[] };

type AdfCodeBlock = {
  type: "codeBlock";
  attrs?: { language?: string };
  content: AdfTextNode[];
};

export type AdfBlockNode =
  | AdfParagraph
  | AdfHeading
  | AdfBulletList
  | AdfOrderedList
  | AdfCodeBlock;

/** Jira description document root. */
export type AdfDoc = {
  type: "doc";
  version: 1;
  content: AdfBlockNode[];
};

function textNode(text: string, marks?: AdfMark[]): AdfTextNode {
  const node: AdfTextNode = { type: "text", text };
  if (marks?.length) node.marks = marks;
  return node;
}

/** Parse inline markdown into ADF text nodes. */
export function parseInlineMarkdown(text: string): AdfInlineNode[] {
  if (!text) return [];

  const nodes: AdfInlineNode[] = [];
  const pattern =
    /(\*\*(.+?)\*\*|__(.+?)__|\*(.+?)\*|_(.+?)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(textNode(text.slice(lastIndex, match.index)));
    }
    if (match[2] || match[3]) {
      nodes.push(textNode(match[2] ?? match[3] ?? "", [{ type: "strong" }]));
    } else if (match[4] || match[5]) {
      nodes.push(textNode(match[4] ?? match[5] ?? "", [{ type: "em" }]));
    } else if (match[6]) {
      nodes.push(textNode(match[6], [{ type: "code" }]));
    } else if (match[7] && match[8]) {
      nodes.push(
        textNode(match[7], [{ type: "link", attrs: { href: match[8] } }])
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(textNode(text.slice(lastIndex)));
  }

  return nodes;
}

function splitMarkdownBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  let i = 0;
  const len = markdown.length;

  while (i < len) {
    while (i < len && (markdown[i] === "\n" || markdown[i] === "\r")) i++;
    if (i >= len) break;

    if (markdown.startsWith("```", i)) {
      const endFence = markdown.indexOf("```", i + 3);
      if (endFence === -1) {
        blocks.push(markdown.slice(i).trimEnd());
        break;
      }
      blocks.push(markdown.slice(i, endFence + 3));
      i = endFence + 3;
      continue;
    }

    const next = markdown.indexOf("\n\n", i);
    if (next === -1) {
      const tail = markdown.slice(i).trim();
      if (tail) blocks.push(tail);
      break;
    }
    const block = markdown.slice(i, next).trim();
    if (block) blocks.push(block);
    i = next + 2;
  }

  return blocks;
}

function listItem(text: string): AdfListItem {
  return {
    type: "listItem",
    content: [{ type: "paragraph", content: parseInlineMarkdown(text) }]
  };
}

function parseMarkdownBlock(block: string): AdfBlockNode | null {
  const fence = /^```([^\n]*)\n([\s\S]*?)```$/.exec(block);
  if (fence) {
    const language = fence[1].trim();
    return {
      type: "codeBlock",
      ...(language ? { attrs: { language } } : {}),
      content: [textNode(fence[2].replace(/\n$/, ""))]
    };
  }

  const heading = /^(#{1,6})\s+(.+)$/.exec(block);
  if (heading) {
    return {
      type: "heading",
      attrs: { level: heading[1].length },
      content: parseInlineMarkdown(heading[2]) as AdfTextNode[]
    };
  }

  const lines = block.split("\n").filter((line) => line.trim().length > 0);
  if (lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line))) {
    return {
      type: "bulletList",
      content: lines.map((line) => listItem(line.replace(/^[-*]\s+/, "")))
    };
  }

  if (lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line))) {
    return {
      type: "orderedList",
      content: lines.map((line) => listItem(line.replace(/^\d+\.\s+/, "")))
    };
  }

  if (lines.length <= 1) {
    return { type: "paragraph", content: parseInlineMarkdown(block) };
  }

  const content: AdfInlineNode[] = [];
  for (let idx = 0; idx < lines.length; idx++) {
    if (idx > 0) content.push({ type: "hardBreak" });
    content.push(...parseInlineMarkdown(lines[idx]));
  }
  return { type: "paragraph", content };
}

/** Convert markdown to a Jira ADF description document. */
export function markdownToAdf(markdown: string): AdfDoc {
  const content: AdfBlockNode[] = [];
  for (const block of splitMarkdownBlocks(markdown.trim())) {
    const node = parseMarkdownBlock(block);
    if (node) content.push(node);
  }
  if (content.length === 0) {
    content.push({ type: "paragraph", content: [] });
  }
  return { type: "doc", version: 1, content };
}

/** True when a string is already a serialized ADF doc. */
export function parseAdfDoc(raw: string): AdfDoc | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { type?: string }).type === "doc"
    ) {
      return parsed as AdfDoc;
    }
  } catch {
    return null;
  }
  return null;
}

/** Write markdown (or existing ADF JSON) to an acli description file. */
export function writeAcliDescriptionFile(
  markdownOrAdfSource: string,
  filePath: string
): void {
  const adf = parseAdfDoc(markdownOrAdfSource) ?? markdownToAdf(markdownOrAdfSource);
  fs.writeFileSync(filePath, JSON.stringify(adf), "utf-8");
}

/** Temp ADF description file for acli; caller must remove `dir`. */
export function prepareAcliDescriptionFile(
  markdownOrAdfSource: string,
  prefix = "jira-desc-"
): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dir, "description.adf.json");
  writeAcliDescriptionFile(markdownOrAdfSource, filePath);
  return { dir, filePath };
}

/** Read a description source file and write an ADF temp file for acli. */
export function prepareAcliDescriptionFileFromPath(
  sourcePath: string,
  prefix = "jira-desc-"
): { dir: string; filePath: string } {
  const source = fs.readFileSync(sourcePath, "utf-8");
  return prepareAcliDescriptionFile(source, prefix);
}
