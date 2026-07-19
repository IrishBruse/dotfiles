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
    const rawLine = lines[i];
    if (/^\s*```/.test(rawLine)) {
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
