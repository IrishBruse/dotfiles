import { fixInlineCodeParts, mapDocumentLines } from "../core/fix-shared.ts";

const PROSE_SEMICOLON = /([a-zA-Z][\w'']*);\s+([a-z])/g;

function fixProseSemicolonsInText(text: string): string {
  if (/https?:\/\//.test(text)) return text;
  if (
    /^\s*(import|export|const|let|var|function|return|class|interface|type|#include|using)\b/.test(
      text
    )
  ) {
    return text;
  }
  return text.replace(PROSE_SEMICOLON, "$1, $2");
}

/** @skills/prose-semicolon */
export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return fixInlineCodeParts(rawLine, fixProseSemicolonsInText);
  });
}
