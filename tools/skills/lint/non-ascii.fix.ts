import { fixInlineCodeParts, mapDocumentLines } from "./fix-shared.ts";

const REPLACEMENTS: [string, string][] = [
  ["\u2014", "-"],
  ["\u2013", "-"],
  ["\u2192", "->"],
  ["\u2190", "<-"],
  ["\u2026", "..."],
  ["\u00a0", " "],
  ["\u2705", ""],
  ["\u274c", ""],
];

function fixNonAsciiInText(text: string): string {
  let result = text;
  for (const [from, to] of REPLACEMENTS) {
    result = result.replaceAll(from, to);
  }

  return [...result]
    .filter((ch) => (ch.codePointAt(0) ?? 0) <= 127)
    .join("");
}

export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return fixInlineCodeParts(rawLine, fixNonAsciiInText);
  });
}
