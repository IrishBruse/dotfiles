import { fixInlineCodeParts, mapDocumentLines } from "../core/fix-shared.ts";

function fixEmDashInText(text: string): string {
  return text.replace(/[\u2013\u2014]/g, "-");
}

/** @skills/em-dash */
export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return fixInlineCodeParts(rawLine, fixEmDashInText);
  });
}
