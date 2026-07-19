import { MAX_LINE } from "./shared.ts";
import { mapDocumentLines } from "./fix-shared.ts";

function wrapLongLine(line: string): string {
  if (line.length <= MAX_LINE || line.includes("://") || /^\s*\|/.test(line)) {
    return line;
  }

  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > MAX_LINE) {
    const slice = remaining.slice(0, MAX_LINE + 1);
    const breakAt = slice.lastIndexOf(". ");
    if (breakAt === -1) break;

    chunks.push(remaining.slice(0, breakAt + 1));
    remaining = remaining.slice(breakAt + 2);
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks.length > 1 ? chunks.join("\n") : line;
}

export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return wrapLongLine(rawLine);
  });
}
