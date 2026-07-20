import { MAX_LINE } from "../core/shared.ts";
import { fixInlineCodeParts, mapDocumentLines } from "../core/fix-shared.ts";

/** Plain paragraph prose, not list items, headings, or other block markdown. */
export function isSimpleProseLine(line: string): boolean {
  const trimmed = line.trimStart();
  if (trimmed === "") return false;
  if (/^#{1,6}\s/.test(trimmed)) return false;
  if (/^[-*+]\s/.test(trimmed)) return false;
  if (/^\d+\.\s/.test(trimmed)) return false;
  if (/^>\s?/.test(trimmed)) return false;
  if (/^\|/.test(trimmed)) return false;
  if (/^```/.test(trimmed)) return false;
  if (/^<[/!?a-zA-Z]/.test(trimmed)) return false;
  if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(trimmed)) return false;
  return true;
}

function findSpaceBreak(slice: string): { splitAt: number; nextAt: number } | null {
  const window = slice.slice(0, MAX_LINE + 1);
  const spaceAt = window.lastIndexOf(" ");
  if (spaceAt <= 0) return null;
  return { splitAt: spaceAt, nextAt: spaceAt + 1 };
}

export function wrapProse(line: string): string {
  if (line.length <= MAX_LINE || line.includes("://")) {
    return line;
  }

  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > MAX_LINE) {
    const br = findSpaceBreak(remaining);
    if (!br) break;

    const head = remaining.slice(0, br.splitAt);
    const tail = remaining.slice(br.nextAt);
    if (head.trim() === "" || tail.trim() === "") break;

    chunks.push(head);
    remaining = tail;
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.length > 1 ? chunks.join("\n") : line;
}

export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    if (
      rawLine.length <= MAX_LINE ||
      rawLine.includes("://") ||
      /^\s*\|/.test(rawLine) ||
      !isSimpleProseLine(rawLine)
    ) {
      return rawLine;
    }
    return fixInlineCodeParts(rawLine, wrapProse);
  });
}
