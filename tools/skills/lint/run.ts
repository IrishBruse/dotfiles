import { lint as lintDescriptionBlock } from "./description-block.ts";
import { lint as lintFrontmatterFields } from "./frontmatter-fields.ts";
import { lint as lintHomeRepoPaths } from "./home-repo-paths.ts";
import { lint as lintLongLines } from "./long-lines.ts";
import { lint as lintNestedReferences } from "./nested-references.ts";
import { lint as lintNonAscii } from "./non-ascii.ts";
import { lint as lintProseSemicolons } from "./prose-semicolons.ts";
import { lint as lintReferenceToc } from "./reference-toc.ts";
import { lint as lintSkillLength } from "./skill-length.ts";
import { lint as lintWindowsPaths } from "./windows-paths.ts";
import { compareDiagnostics, type Diagnostic } from "./types.ts";

export function lintSkillContent(
  content: string,
  filePath?: string
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [
    ...lintProseSemicolons(content),
    ...lintLongLines(content),
    ...lintDescriptionBlock(content),
    ...lintFrontmatterFields(content, filePath),
    ...lintHomeRepoPaths(content),
    ...lintNonAscii(content),
    ...lintWindowsPaths(content),
    ...lintNestedReferences(content, filePath),
    ...lintReferenceToc(content, filePath),
    ...lintSkillLength(content, filePath),
  ];
  diagnostics.sort(compareDiagnostics);
  return diagnostics;
}
