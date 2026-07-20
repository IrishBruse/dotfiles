import { MAX_LINE } from "./shared.ts";
import { fixInlineCodeParts, mapDocumentLines } from "./fix-shared.ts";

const BREAK_AFTER = [". ", "? ", "! ", ", "] as const;

function findBreak(slice: string): { splitAt: number; nextAt: number } | null {
  let bestAt = -1;
  let bestDelim = "";

  for (const delim of BREAK_AFTER) {
    const at = slice.lastIndexOf(delim);
    if (at > bestAt) {
      bestAt = at;
      bestDelim = delim;
    }
  }

  if (bestAt !== -1) {
    return { splitAt: bestAt + 1, nextAt: bestAt + bestDelim.length };
  }

  const spaceAt = slice.lastIndexOf(" ");
  if (spaceAt > 0) {
    return { splitAt: spaceAt, nextAt: spaceAt + 1 };
  }

  return null;
}

export function wrapProse(line: string): string {
  if (line.length <= MAX_LINE || line.includes("://")) {
    return line;
  }

  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > MAX_LINE) {
    const br = findBreak(remaining.slice(0, MAX_LINE + 1));
    if (!br) break;

    chunks.push(remaining.slice(0, br.splitAt));
    remaining = remaining.slice(br.nextAt);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.length > 1 ? chunks.join("\n") : line;
}

export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    if (rawLine.length <= MAX_LINE || rawLine.includes("://") || /^\s*\|/.test(rawLine)) {
      return rawLine;
    }
    return fixInlineCodeParts(rawLine, wrapProse);
  });
}
