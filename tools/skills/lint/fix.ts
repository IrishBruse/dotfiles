import { fix as fixDescriptionBlock } from "./description-block.fix.ts";
import { fix as fixEmDash } from "./em-dash.fix.ts";
import { fix as fixFrontmatterDescription } from "./frontmatter-description.fix.ts";
import { fix as fixHomeRepoPaths } from "./home-repo-paths.fix.ts";
import { fix as fixLongLines } from "./long-lines.fix.ts";
import { fix as fixNestedReferences } from "./nested-references.fix.ts";
import { fix as fixNonAscii } from "./non-ascii.fix.ts";
import { fix as fixProseSemicolons } from "./prose-semicolons.fix.ts";
import { fix as fixReferenceToc } from "./reference-toc.fix.ts";

export function fixSkillContent(content: string, filePath?: string): string {
  let result = content;
  result = fixDescriptionBlock(result);
  result = fixFrontmatterDescription(result);
  result = fixHomeRepoPaths(result);
  result = fixProseSemicolons(result);
  result = fixEmDash(result);
  result = fixNonAscii(result);
  result = fixNestedReferences(result, filePath);
  result = fixReferenceToc(result, filePath);
  result = fixLongLines(result);
  return result;
}
