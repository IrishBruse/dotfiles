import { extractFrontmatter } from "./shared.ts";
import type { Diagnostic } from "./types.ts";

const DESCRIPTION_BLOCK_SCALAR = /^description:\s*[>|][-+]?(?:\s|$)/m;

export function lint(content: string): Diagnostic[] {
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter || !DESCRIPTION_BLOCK_SCALAR.test(frontmatter)) return [];

  const match = frontmatter.match(DESCRIPTION_BLOCK_SCALAR);
  if (!match || match.index === undefined) return [];

  const frontmatterStart = content.indexOf("\n", 3) + 1;
  const absoluteIndex = frontmatterStart + match.index;
  const lineStart = content.lastIndexOf("\n", absoluteIndex) + 1;

  return [
    {
      line: content.slice(0, absoluteIndex).split("\n").length,
      column: absoluteIndex - lineStart + 1,
      code: "description-block",
      message:
        "Frontmatter `description` must be a plain YAML string, not a block scalar (`>`, `|`, or variants).",
    },
  ];
}
