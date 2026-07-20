import { yamlQuote } from "../core/fix-shared.ts";

const DESCRIPTION_BLOCK_SCALAR =
  /^description:\s*([>|])([-+]?)(\d+)?([+-])?\s*$/;

function foldBlock(lines: string[]): string {
  const parts: string[] = [];
  let paragraph: string[] = [];

  const flush = (): void => {
    if (paragraph.length === 0) return;
    parts.push(paragraph.join(" ").replace(/\s+/g, " ").trim());
    paragraph = [];
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flush();
      continue;
    }
    paragraph.push(line.trim());
  }
  flush();

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function literalBlock(lines: string[]): string {
  return lines
    .map((line) => line.trimEnd())
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fix(content: string): string {
  const match = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!match) return content;

  const lines = match[1].split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const scalarMatch = line.match(DESCRIPTION_BLOCK_SCALAR);
    if (!scalarMatch) {
      out.push(line);
      i++;
      continue;
    }

    const isLiteral = scalarMatch[1] === "|";
    i++;
    const blockLines: string[] = [];

    while (i < lines.length) {
      const next = lines[i];
      if (next.trim() === "") {
        blockLines.push("");
        i++;
        continue;
      }
      const indentMatch = /^(\s+)(.*)$/.exec(next);
      if (!indentMatch) break;
      blockLines.push(indentMatch[2]);
      i++;
    }

    const text = isLiteral ? literalBlock(blockLines) : foldBlock(blockLines);
    out.push(`description: ${yamlQuote(text)}`);
  }

  const frontmatter = out.join("\n");
  return content.replace(/^---\n[\s\S]*?\n---/, `---\n${frontmatter}\n---`);
}
