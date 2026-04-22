import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const updateCommandDir = path.dirname(fileURLToPath(import.meta.url));

export type UpdatePromptVars = {
  hintBlock: string;
  /** Non-empty only when PR_TITLE_JIRA_KEY is set; see create work jira policy. */
  workJiraTitleSection: string;
};

export function loadUpdateAgentPrompt(vars: UpdatePromptVars): string {
  const template = fs.readFileSync(
    path.join(updateCommandDir, "prompt.md"),
    "utf8",
  );
  return template
    .replaceAll("{{hintBlock}}", vars.hintBlock)
    .replaceAll("{{workJiraTitleSection}}", vars.workJiraTitleSection);
}
