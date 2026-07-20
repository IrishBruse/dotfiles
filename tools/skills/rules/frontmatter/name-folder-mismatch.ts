import path from "node:path";

import { parseSkillFrontmatter } from "../../frontmatter.ts";
import { filePathFromContext, type LintContext } from "../core/context.ts";
import { extractFrontmatter, isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

/** @skills/name-folder-mismatch */
export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  if (!isSkillMd(filePath)) return [];

  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) return [];

  const parsed = parseSkillFrontmatter(frontmatter);
  const nameEntry = parsed.entries.find((entry) => entry.key === "name");
  if (nameEntry === undefined || typeof nameEntry.value !== "string") return [];

  const name = nameEntry.value.trim();
  const folderName = path.basename(path.dirname(filePath ?? ""));
  if (name === folderName) return [];

  return [
    {
      line: 1,
      column: 1,
      code: "name-folder-mismatch",
      severity: "error",
      message: `Frontmatter \`name\` "${name}" must match the skill folder name "${folderName}".`,
    },
  ];
}
