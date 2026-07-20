import { lint as lintSkillLength } from "../budget/skill-length.ts";
import { lint as lintSkillTokenBudget } from "../budget/skill-token-budget.ts";
import { filePathFromContext, type LintContext } from "../core/context.ts";
import { compareDiagnostics, type Diagnostic } from "../core/types.ts";
import { lint as lintDescriptionBlock } from "../frontmatter/description-block.ts";
import { lint as lintFrontmatterFields } from "../frontmatter/frontmatter-fields.ts";
import { lint as lintNameFolderMismatch } from "../frontmatter/name-folder-mismatch.ts";
import { lint as lintSkillByPath } from "../paths/skill-by-path.ts";
import { lint as lintWindowsPaths } from "../paths/windows-paths.ts";
import { lint as lintEmDash } from "../prose/em-dash.ts";
import { lint as lintGenericAdvice } from "../prose/generic-advice.ts";
import { lint as lintLongLines } from "../prose/long-lines.ts";
import { lint as lintNegationSteering } from "../prose/negation-steering.ts";
import { lint as lintNonAscii } from "../prose/non-ascii.ts";
import { lint as lintProseSemicolons } from "../prose/prose-semicolons.ts";
import { lint as lintTimeSensitive } from "../prose/time-sensitive.ts";
import { lint as lintToolMenu } from "../prose/tool-menu.ts";
import { lint as lintBrokenLink } from "../reference/broken-link.ts";
import { lint as lintMissingScript } from "../reference/missing-script.ts";
import { lint as lintNestedReferences } from "../reference/nested-references.ts";
import { lint as lintOrphanReference } from "../reference/orphan-reference.ts";
import { lint as lintReferenceToc } from "../reference/reference-toc.ts";
import { lint as lintSkillBacklink } from "../reference/skill-backlink.ts";
import { lint as lintVaguePointer } from "../reference/vague-pointer.ts";

export type { LintContext } from "../core/context.ts";

export function lintSkillContent(
  content: string,
  filePathOrContext?: string | LintContext
): Diagnostic[] {
  const filePath = filePathFromContext(filePathOrContext);
  const diagnostics: Diagnostic[] = [
    ...lintProseSemicolons(content),
    ...lintLongLines(content),
    ...lintDescriptionBlock(content),
    ...lintFrontmatterFields(content, filePath),
    ...lintNonAscii(content),
    ...lintEmDash(content),
    ...lintWindowsPaths(content),
    ...lintNestedReferences(content, filePath),
    ...lintReferenceToc(content, filePath),
    ...lintSkillLength(content, filePath),
    ...lintSkillBacklink(content, filePathOrContext),
    ...lintSkillTokenBudget(content, filePathOrContext),
    ...lintNameFolderMismatch(content, filePathOrContext),
    ...lintBrokenLink(content, filePathOrContext),
    ...lintMissingScript(content, filePathOrContext),
    ...lintOrphanReference(content, filePathOrContext),
    ...lintGenericAdvice(content),
    ...lintToolMenu(content),
    ...lintVaguePointer(content, filePathOrContext),
    ...lintNegationSteering(content),
    ...lintSkillByPath(content),
    ...lintTimeSensitive(content),
  ];
  diagnostics.sort(compareDiagnostics);
  return diagnostics;
}
