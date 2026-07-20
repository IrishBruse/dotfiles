import {
  getCodeBlockLineRanges,
  headingAnchor,
  isLineInCodeBlock,
} from "../core/fix-shared.ts";
import { isSkillMd } from "../core/shared.ts";
import { MIN_REFERENCE_LINES } from "./reference-toc.ts";

const TOC_HEADING = /^#{1,6}\s+(?:contents|table of contents)\b/i;
const LEVEL_TWO_HEADING = /^## (.+)$/;

function hasContentsHeading(
  lines: string[],
  codeBlockRanges: Array<{ start: number; end: number }>
): boolean {
  return lines
    .slice(0, 30)
    .some(
      (line, index) =>
        !isLineInCodeBlock(index, codeBlockRanges) &&
        TOC_HEADING.test(line.trim())
    );
}

function collectSectionHeadings(
  lines: string[],
  codeBlockRanges: Array<{ start: number; end: number }>
): string[] {
  const headings: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    if (isLineInCodeBlock(index, codeBlockRanges)) continue;
    const line = lines[index] ?? "";
    const match = LEVEL_TWO_HEADING.exec(line);
    if (!match) continue;
    const title = match[1]?.trim() ?? "";
    if (TOC_HEADING.test(line.trim())) continue;
    headings.push(title);
  }

  return headings;
}

export function fix(content: string, filePath?: string): string {
  if (filePath === undefined || isSkillMd(filePath)) return content;

  const lines = content.split("\n");
  if (lines.length <= MIN_REFERENCE_LINES) return content;

  const codeBlockRanges = getCodeBlockLineRanges(content);
  if (hasContentsHeading(lines, codeBlockRanges)) return content;

  const firstSectionIndex = lines.findIndex(
    (line, index) =>
      !isLineInCodeBlock(index, codeBlockRanges) && /^## /.test(line)
  );
  if (firstSectionIndex === -1) return content;

  const headings = collectSectionHeadings(lines, codeBlockRanges);
  if (headings.length === 0) return content;

  const tocLines = [
    "## Contents",
    "",
    ...headings.map(
      (heading) => `- [${heading}](#${headingAnchor(heading)})`
    ),
    "",
  ];

  const insertIndex = firstSectionIndex;
  const needsBlankLine =
    insertIndex > 0 && lines[insertIndex - 1]?.trim() !== "";
  const block = needsBlankLine ? ["", ...tocLines] : tocLines;

  const updated = [
    ...lines.slice(0, insertIndex),
    ...block,
    ...lines.slice(insertIndex),
  ];

  return updated.join("\n");
}
