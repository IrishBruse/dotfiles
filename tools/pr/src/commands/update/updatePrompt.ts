import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { workJiraTitlePromptSection } from "../../jiraTitlePolicy.ts";

const updateCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type UpdatePromptVars = {
  prLine: string;
  prefetchedContextSection: string;
  hintBlock: string;
};

export function expandUpdatePlaceholders(
  template: string,
  vars: UpdatePromptVars,
): string {
  return template
    .replaceAll("{{prLine}}", vars.prLine)
    .replaceAll("{{prefetchedContextSection}}", vars.prefetchedContextSection)
    .replaceAll("{{hintBlock}}", vars.hintBlock);
}

export function loadUpdateAgentPrompt(vars: UpdatePromptVars): string {
  const template = fs.readFileSync(
    path.join(updateCommandDir, "prompt.md"),
    "utf8",
  );
  return expandUpdatePlaceholders(template, vars) + workJiraTitlePromptSection();
}

export function buildUpdatePrLine(target: string): string {
  return `**PR to update:** \`${target}\` — number or URL. The CLI runs \`gh pr edit\` with your final **title** and **body**; prefetched files are in the **workspace root**.`;
}
