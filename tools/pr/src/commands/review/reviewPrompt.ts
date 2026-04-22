import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildWorkJiraTitleSection } from "../create/work/jiraTitlePolicy.ts";

const reviewCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type ReviewPromptVars = {
  prLine: string;
  hintBlock: string;
  /** Non-empty only when PR_TITLE_JIRA_KEY is set (work overlay); see {@link buildWorkJiraTitleSection}. */
  workJiraTitleSection: string;
};

export function expandReviewPlaceholders(
  template: string,
  vars: ReviewPromptVars,
): string {
  return template
    .replaceAll("{{prLine}}", vars.prLine)
    .replaceAll("{{hintBlock}}", vars.hintBlock)
    .replaceAll("{{workJiraTitleSection}}", vars.workJiraTitleSection);
}

export function loadReviewAgentPrompt(vars: ReviewPromptVars): string {
  const template = fs.readFileSync(
    path.join(reviewCommandDir, "prompt.md"),
    "utf8",
  );
  return expandReviewPlaceholders(template, vars);
}

export function buildPrLine(target: string): string {
  return `**Review target:** \`${target}\` — PR number (current repo) or full PR URL. Use this with \`gh pr view\`, \`gh pr diff\`, and related commands.`;
}
