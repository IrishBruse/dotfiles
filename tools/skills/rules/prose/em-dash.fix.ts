import { forEachProseLine } from "../core/shared.ts";

export function fix(content: string): string {
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    lines[i] = line.replace(/[\u2013\u2014]/g, ", ");
  }

  return lines.join("\n");
}
