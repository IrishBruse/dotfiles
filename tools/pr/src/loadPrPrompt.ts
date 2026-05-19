import { expandNamedPrompt } from "../../interpolate/src/api.ts";
import { printInterpolationErrors } from "../../interpolate/src/errors.ts";
import { promptPath, resolvePromptsDir } from "../../interpolate/src/promptsDir.ts";
import { isPrCliWork } from "./jiraTitlePolicy.ts";
import { buildJiraPromptSection } from "./jiraPromptSection.ts";
import type { PrPromptWorkspaceMode } from "./prPromptWorkspaceFiles.ts";

export type PrInterpolatePromptName = "pr-create" | "pr-update" | "pr-review";

function modeForPrompt(name: PrInterpolatePromptName): PrPromptWorkspaceMode {
  if (name === "pr-create") {
    return "create";
  }
  if (name === "pr-update") {
    return "update";
  }
  return "review";
}

export type LoadPrAgentPromptOptions = {
  name: PrInterpolatePromptName;
  repoRoot: string;
  vars: Record<string, string>;
  jiraTitle: string;
  jiraBody: string;
};

export function loadPrAgentPrompt(options: LoadPrAgentPromptOptions): string {
  const { name, repoRoot, vars, jiraTitle, jiraBody } = options;
  const jiraContext = buildJiraPromptSection(
    jiraTitle,
    jiraBody,
    modeForPrompt(name),
  );
  const file = promptPath(resolvePromptsDir(undefined), name);
  const result = expandNamedPrompt(name, {
    cwd: repoRoot,
    vars: {
      ...vars,
      jiraContext,
      work: isPrCliWork() ? "1" : "",
    },
  });
  if (result.ok === false) {
    printInterpolationErrors(file, result.errors);
    throw new Error(`pr: failed to expand interpolate prompt "${name}"`);
  }
  return result.text;
}
