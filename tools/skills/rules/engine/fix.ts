import { fix as fixDescriptionBlock } from "../frontmatter/description-block.fix.ts";
import { fix as fixFrontmatterDescription } from "../frontmatter/frontmatter-description.fix.ts";
import { fix as fixEmDash } from "../prose/em-dash.fix.ts";
import { fix as fixLongLines } from "../prose/long-lines.fix.ts";
import { fix as fixNonAscii } from "../prose/non-ascii.fix.ts";
import { fix as fixProseSemicolons } from "../prose/prose-semicolons.fix.ts";
import { fix as fixNestedReferences } from "../reference/nested-references.fix.ts";
import { fix as fixReferenceToc } from "../reference/reference-toc.fix.ts";

export function fixSkillContent(content: string, filePath?: string): string {
  let result = content;
  result = fixDescriptionBlock(result);
  result = fixFrontmatterDescription(result);
  result = fixProseSemicolons(result);
  result = fixEmDash(result);
  result = fixNonAscii(result);
  result = fixNestedReferences(result, filePath);
  result = fixReferenceToc(result, filePath);
  result = fixLongLines(result);
  return result;
}
