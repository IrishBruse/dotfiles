import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const promptsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "prompts");

export type ReviewPromptVars = {
  prLine: string;
  hintBlock: string;
  jiraBlock: string;
};

export function expandReviewPlaceholders(template: string, vars: ReviewPromptVars): string {
  return template
    .replaceAll("{{prLine}}", vars.prLine)
    .replaceAll("{{hintBlock}}", vars.hintBlock)
    .replaceAll("{{jiraBlock}}", vars.jiraBlock);
}

export function loadReviewAgentPrompt(vars: ReviewPromptVars): string {
  const shared = fs.readFileSync(path.join(promptsDir, "shared.md"), "utf8");
  const review = fs.readFileSync(path.join(promptsDir, "review.md"), "utf8");
  return expandReviewPlaceholders(`${shared}\n\n${review}`, vars);
}

export function buildPrLine(target: string): string {
  return `**Review target:** \`${target}\` — PR number (current repo) or full PR URL. Use this with \`gh pr view\`, \`gh pr diff\`, and related commands.`;
}

export function buildJiraBlockFromEnv(): string {
  const key = process.env.PR_TITLE_JIRA_KEY;
  if (key === undefined || key === "") {
    return "";
  }
  return `\n## Title policy\n\nWhen posting, ensure the PR title matches policy: it must start with \`${key}-<digits>\` if your org requires it.\n`;
}
