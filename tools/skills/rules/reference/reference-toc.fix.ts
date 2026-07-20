import { headingAnchor } from "../core/fix-shared.ts";
import { isSkillMd } from "../core/shared.ts";
import { MIN_REFERENCE_LINES } from "./reference-toc.ts";

const TOC_HEADING = /^#{1,6}\s+(?:contents|table of contents)\b/i;
const LEVEL_TWO_HEADING = /^## (.+)$/;

function hasContentsHeading(lines: string[]): boolean {
  return lines.slice(0, 30).some((line) => TOC_HEADING.test(line.trim()));
}

function collectSectionHeadings(lines: string[]): string[] {
  const headings: string[] = [];

  for (const line of lines) {
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
  if (hasContentsHeading(lines)) return content;

  const firstSectionIndex = lines.findIndex((line) => /^## /.test(line));
  if (firstSectionIndex === -1) return content;

  const headings = collectSectionHeadings(lines);
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
