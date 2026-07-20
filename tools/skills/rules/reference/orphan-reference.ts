import { contextFromArg, filePathFromContext, resolveSkillRelativePath, type LintContext } from "../core/context.ts";
import { isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

const MARKDOWN_LINK = /\[[^\]]+\]\(([^)]+)\)/g;
const BACKTICK_MD = /`([^`]+\.md(?:#[^`]*)?)`/g;

function collectReferencesFromFile(
  fromRelative: string,
  content: string,
  linked: Set<string>
): void {
  let match: RegExpExecArray | null;

  MARKDOWN_LINK.lastIndex = 0;
  while ((match = MARKDOWN_LINK.exec(content)) !== null) {
    const target = match[1]?.split("#")[0]?.split("?")[0]?.trim() ?? "";
    if (!/\.md(?:$|[?#])/i.test(target)) continue;
    const resolved = resolveSkillRelativePath(fromRelative, target);
    if (resolved) linked.add(resolved);
  }

  BACKTICK_MD.lastIndex = 0;
  while ((match = BACKTICK_MD.exec(content)) !== null) {
    const target = match[1]?.split("#")[0]?.split("?")[0]?.trim() ?? "";
    if (!/\.md$/i.test(target)) continue;
    const resolved = resolveSkillRelativePath(fromRelative, target);
    if (resolved) linked.add(resolved);
  }
}

/** @skills/orphan-reference */
export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  const context = contextFromArg(filePathOrContext);
  if (!isSkillMd(filePath) || context === undefined) return [];

  const linked = new Set<string>();
  for (const [relative, fileContent] of context.markdownContents) {
    collectReferencesFromFile(relative, fileContent, linked);
  }

  const diagnostics: Diagnostic[] = [];

  for (const relative of context.relativeFiles) {
    if (!relative.startsWith("references/")) continue;
    if (!relative.endsWith(".md") && !relative.endsWith(".mdc")) continue;
    if (linked.has(relative)) continue;

    diagnostics.push({
      line: 1,
      column: 1,
      code: "orphan-reference",
      message: `Reference file "${relative}" is not linked from any skill markdown file.`,
    });
    if (diagnostics.length >= 3) return diagnostics;
  }

  return diagnostics;
}
