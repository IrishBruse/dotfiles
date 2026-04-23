import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isJiraTitlePolicyEnabled } from "../create/work/jiraTitlePolicy.ts";

const updateCommandDir = path.dirname(fileURLToPath(import.meta.url));
const createCommandDir = path.join(updateCommandDir, "..", "create");

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
  let out = expandUpdatePlaceholders(template, vars);
  if (isJiraTitlePolicyEnabled()) {
    const key = process.env.PR_TITLE_JIRA_KEY!.trim();
    const appendix = fs
      .readFileSync(path.join(createCommandDir, "work", "prompt.md"), "utf8")
      .replaceAll("{{JIRA_PROJECT_KEY}}", key)
      .replaceAll("`pr create`", "`pr update`")
      .replaceAll("pr create", "pr update");
    out = `${out}\n\n${appendix}`;
  }
  return out;
}

export function buildUpdatePrLine(target: string): string {
  return `**PR to update:** \`${target}\` — number or URL. The CLI runs \`gh pr edit\` with your final **title** and **body**; prefetched files are in the **workspace root**.`;
}
