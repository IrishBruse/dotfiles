import { fixInlineCodeParts, mapDocumentLines } from "../core/fix-shared.ts";

export const PROSE_SEMICOLON = /([a-zA-Z][\w'']*);\s+([a-z][\w'']*)/g;

export function shouldSkipProseSemicolonSegment(text: string): boolean {
  if (/https?:\/\//.test(text)) return true;
  if (
    /^\s*(import|export|const|let|var|function|return|class|interface|type|#include|using)\b/.test(
      text
    )
  ) {
    return true;
  }
  return false;
}

export function forEachEditableProseSegment(
  rawLine: string,
  fn: (segment: string, segmentStart: number) => void
): void {
  const parts = rawLine.split(/(`[^`\n]+`)/g);
  let offset = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] ?? "";
    if (i % 2 === 0) {
      fn(part, offset);
    }
    offset += part.length;
  }
}

function fixProseSemicolonsInText(text: string): string {
  if (shouldSkipProseSemicolonSegment(text)) {
    return text;
  }
  return text.replace(PROSE_SEMICOLON, "$1, $2");
}

export function fixProseSemicolonLine(rawLine: string): string {
  return fixInlineCodeParts(rawLine, fixProseSemicolonsInText);
}

export function canAutoFixProseSemicolon(rawLine: string): boolean {
  return fixProseSemicolonLine(rawLine) !== rawLine;
}

/** @skills/prose-semicolon */
export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return fixProseSemicolonLine(rawLine);
  });
}
