import { filePathFromContext, type LintContext } from "../core/context.ts";
import { extractFrontmatter, isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

export const MAX_SKILL_TOKENS = 5000;
const CHARS_PER_TOKEN = 4;

export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  if (!isSkillMd(filePath)) return [];

  const frontmatter = extractFrontmatter(content);
  const body =
    frontmatter.length > 0
      ? content.slice(content.indexOf("\n---", 3) + 4)
      : content;
  const estimatedTokens = Math.ceil(body.length / CHARS_PER_TOKEN);
  if (estimatedTokens <= MAX_SKILL_TOKENS) return [];

  return [
    {
      line: 1,
      column: 1,
      code: "skill-token-budget",
      message: `SKILL.md body exceeds ~${MAX_SKILL_TOKENS} estimated tokens (${estimatedTokens}). Split reference behind pointers or into sibling files.`,
    },
  ];
}
