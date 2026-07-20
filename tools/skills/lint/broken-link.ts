import path from "node:path";

import {
  contextFromArg,
  filePathFromContext,
  resolveRelativeLink,
  resolveSkillRelativePath,
  type LintContext,
} from "./context.ts";
import type { Diagnostic } from "./types.ts";

const MARKDOWN_LINK = /\[[^\]]+\]\(([^)]+)\)/g;
const LINK_TARGET = /\.(?:md|mdc|py|sh|ts|js|mjs|cjs|rb|pl)(?:$|[?#])/i;

function stripInlineCode(text: string): string {
  return text.replace(/`[^`\n]+`/g, "");
}

export function lint(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  const context = contextFromArg(filePathOrContext);
  if (filePath === undefined || context === undefined) return [];

  const fromRelative = path
    .relative(context.skillRoot, filePath)
    .split(path.sep)
    .join("/");

  const diagnostics: Diagnostic[] = [];
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const prose = stripInlineCode(line);

    MARKDOWN_LINK.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = MARKDOWN_LINK.exec(prose)) !== null) {
      const target = match[1] ?? "";
      if (!LINK_TARGET.test(target)) continue;

      const relative =
        resolveRelativeLink(filePath, target) ??
        resolveSkillRelativePath(fromRelative, target);
      if (relative === undefined) continue;
      if (relative === "SKILL.md") continue;
      if (context.relativeFiles.has(relative)) continue;

      diagnostics.push({
        line: i + 1,
        column: match.index + 1,
        code: "broken-link",
        severity: "error",
        message: `Broken link target "${target}" (resolved to "${relative}").`,
      });
      if (diagnostics.length >= 3) return diagnostics;
    }
  }

  return diagnostics;
}
