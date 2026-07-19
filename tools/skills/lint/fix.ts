import { fix as fixDescriptionBlock } from "./description-block.fix.ts";
import { fix as fixHomeRepoPaths } from "./home-repo-paths.fix.ts";
import { fix as fixLongLines } from "./long-lines.fix.ts";
import { fix as fixNonAscii } from "./non-ascii.fix.ts";
import { fix as fixProseSemicolons } from "./prose-semicolons.fix.ts";

export function fixSkillContent(content: string): string {
  let result = content;
  result = fixDescriptionBlock(result);
  result = fixHomeRepoPaths(result);
  result = fixProseSemicolons(result);
  result = fixNonAscii(result);
  result = fixLongLines(result);
  return result;
}
