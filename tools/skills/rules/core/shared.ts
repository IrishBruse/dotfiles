import path from "node:path";

export function isSkillMd(filePath?: string): boolean {
  return filePath !== undefined && path.basename(filePath) === "SKILL.md";
}

export function stripCodeSections(text: string): string {
  let result = text.replace(/```[\s\S]*?```/g, "");
  result = result.replace(/`[^`\n]+`/g, "");
  return result;
}

export function extractFrontmatter(content: string): string {
  if (!content.startsWith("---")) return "";
  const end = content.indexOf("\n---", 3);
  if (end === -1) return "";
  return content.slice(3, end);
}

export function isInFrontmatter(content: string, lineNumber: number): boolean {
  if (!content.startsWith("---")) return false;
  const closeMarker = content.indexOf("\n---", 3);
  if (closeMarker === -1) return false;
  const closeLine = content.slice(0, closeMarker).split("\n").length + 1;
  return lineNumber >= 1 && lineNumber <= closeLine;
}

export function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split("\n").length;
}

export function forEachProseLine(
  content: string,
  fn: (prose: string, lineNumber: number, rawLine: string) => void
): void {
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (/^\s*```/.test(rawLine)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const prose = rawLine.replace(/`[^`\n]+`/g, "");
    fn(prose, i + 1, rawLine);
  }
}
