import path from "node:path";

import { mapDocumentLines } from "../core/fix-shared.ts";
import { isSkillMd } from "../core/shared.ts";

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

function isSkillMarkdownTarget(target: string): boolean {
  const normalized = target.split("#")[0]?.split("?")[0]?.trim() ?? "";
  return path.basename(normalized) === "SKILL.md";
}

function fixNestedReferenceLinks(text: string): string {
  return text.replace(MARKDOWN_LINK, (match, _label, target: string) => {
    if (!/\.md(?:$|[?#])/i.test(target)) return match;
    if (isSkillMarkdownTarget(target)) return match;
    const pathOnly = target.split("#")[0]?.split("?")[0]?.trim() ?? target;
    return `\`${pathOnly}\``;
  });
}

export function fix(content: string, filePath?: string): string {
  if (filePath === undefined || isSkillMd(filePath)) return content;

  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return fixNestedReferenceLinks(rawLine);
  });
}
