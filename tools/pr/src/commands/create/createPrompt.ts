import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isJiraTitlePolicyEnabled } from "./work/jiraTitlePolicy.ts";

const promptsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "prompts",
);

/**
 * Core create prompt only — no work/org overlay.
 * When {@link loadCreateAgentPrompt} runs with work policy enabled, it appends `prompts/work/create-appendix.md`.
 */
export function loadCreateBasePrompt(): string {
  return fs.readFileSync(path.join(promptsDir, "create.md"), "utf8");
}

/** Full prompt for `pr create`: base markdown, plus work appendix only when PR_TITLE_JIRA_KEY is set. */
export function loadCreateAgentPrompt(): string {
  const base = loadCreateBasePrompt();
  if (!isJiraTitlePolicyEnabled()) {
    return base;
  }
  const key = process.env.PR_TITLE_JIRA_KEY!.trim();
  const appendix = fs
    .readFileSync(path.join(promptsDir, "work", "create-appendix.md"), "utf8")
    .replaceAll("{{JIRA_PROJECT_KEY}}", key);
  return `${base}\n\n${appendix}`;
}
