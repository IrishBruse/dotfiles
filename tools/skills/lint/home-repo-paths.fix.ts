import { fixInlineCodeParts, mapDocumentLines } from "./fix-shared.ts";

const HOME_REPO_PATH = /home\/\.(agents|cursor)\//g;

function fixHomeRepoPathsInText(text: string): string {
  return text.replace(HOME_REPO_PATH, "~/.$1/");
}

export function fix(content: string): string {
  return mapDocumentLines(content, (rawLine, _lineNumber, inCodeBlock) => {
    if (inCodeBlock) return rawLine;
    return fixInlineCodeParts(rawLine, fixHomeRepoPathsInText);
  });
}
