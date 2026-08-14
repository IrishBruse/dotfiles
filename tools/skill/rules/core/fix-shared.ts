export function headingAnchor(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

export function yamlSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function isCodeFenceLine(line: string): boolean {
  return /^\s*```/.test(line);
}

/** Inclusive line-index ranges for fenced ``` code blocks, including fence lines. */
export function getCodeBlockLineRanges(
  content: string
): Array<{ start: number; end: number }> {
  const lines = content.split("\n");
  const ranges: Array<{ start: number; end: number }> = [];
  let openIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (!isCodeFenceLine(lines[i] ?? "")) continue;
    if (openIndex === -1) {
      openIndex = i;
      continue;
    }
    ranges.push({ start: openIndex, end: i });
    openIndex = -1;
  }

  return ranges;
}

export function isLineInCodeBlock(
  lineIndex: number,
  codeBlockRanges: Array<{ start: number; end: number }>
): boolean {
  return codeBlockRanges.some(
    (range) => lineIndex >= range.start && lineIndex <= range.end
  );
}

export function fixInlineCodeParts(
  line: string,
  fixer: (prose: string) => string
): string {
  const parts = line.split(/(`[^`\n]+`)/g);
  return parts
    .map((part, index) => (index % 2 === 1 ? part : fixer(part)))
    .join("");
}

export function mapDocumentLines(
  content: string,
  fn: (rawLine: string, lineNumber: number, inCodeBlock: boolean) => string
): string {
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i] ?? "";
    if (isCodeFenceLine(rawLine)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    lines[i] = fn(rawLine, i + 1, inCodeBlock);
  }

  return lines.join("\n");
}

export function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
