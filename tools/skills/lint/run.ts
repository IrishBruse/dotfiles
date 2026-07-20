import { lint as lintBrokenLink } from "./broken-link.ts";
import { filePathFromContext, type LintContext } from "./context.ts";
import { lint as lintDescriptionBlock } from "./description-block.ts";
import { lint as lintEmDash } from "./em-dash.ts";
import { lint as lintFrontmatterFields } from "./frontmatter-fields.ts";
import { lint as lintGenericAdvice } from "./generic-advice.ts";
import { lint as lintHomeRepoPaths } from "./home-repo-paths.ts";
import { lint as lintLongLines } from "./long-lines.ts";
import { lint as lintMissingScript } from "./missing-script.ts";
import { lint as lintNameFolderMismatch } from "./name-folder-mismatch.ts";
import { lint as lintNegationSteering } from "./negation-steering.ts";
import { lint as lintNestedReferences } from "./nested-references.ts";
import { lint as lintNonAscii } from "./non-ascii.ts";
import { lint as lintOrphanReference } from "./orphan-reference.ts";
import { lint as lintProseSemicolons } from "./prose-semicolons.ts";
import { lint as lintReferenceToc } from "./reference-toc.ts";
import { lint as lintSkillByPath } from "./skill-by-path.ts";
import { lint as lintSkillLength } from "./skill-length.ts";
import { lint as lintSkillTokenBudget } from "./skill-token-budget.ts";
import { lint as lintTimeSensitive } from "./time-sensitive.ts";
import { lint as lintToolMenu } from "./tool-menu.ts";
import { lint as lintVaguePointer } from "./vague-pointer.ts";
import { lint as lintWindowsPaths } from "./windows-paths.ts";
import { compareDiagnostics, type Diagnostic } from "./types.ts";

export type { LintContext } from "./context.ts";

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
    ...lintHomeRepoPaths(content),
    ...lintNonAscii(content),
    ...lintEmDash(content),
    ...lintWindowsPaths(content),
    ...lintNestedReferences(content, filePath),
    ...lintReferenceToc(content, filePath),
    ...lintSkillLength(content, filePath),
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
