import { lint as lintDescriptionBlock } from "./description-block.ts";
import { lint as lintHomeRepoPaths } from "./home-repo-paths.ts";
import { lint as lintLongLines } from "./long-lines.ts";
import { lint as lintNonAscii } from "./non-ascii.ts";
import { lint as lintProseSemicolons } from "./prose-semicolons.ts";
import { compareDiagnostics, type Diagnostic } from "./types.ts";

export function lintSkillContent(content: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [
    ...lintProseSemicolons(content),
    ...lintLongLines(content),
    ...lintDescriptionBlock(content),
    ...lintHomeRepoPaths(content),
    ...lintNonAscii(content),
  ];
  diagnostics.sort(compareDiagnostics);
  return diagnostics;
}
