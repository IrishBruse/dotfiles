import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadCreateWorkPromptAppendix,
  loadReviewWorkPromptAppendix,
  loadUpdateWorkPromptAppendix,
} from "../jiraTitlePolicy.ts";

const commandsDir = path.dirname(fileURLToPath(import.meta.url));

const defaultPrBodyInstructions = fs.readFileSync(
  path.join(commandsDir, "pr-body-default.md"),
  "utf8",
);

function expandPromptPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

function loadAgentPrompt(
  subcommand: "create" | "update" | "review",
  vars: Record<string, string>,
  workAppendix: () => string,
): string {
  const dir = path.join(commandsDir, subcommand);
  const template = fs.readFileSync(path.join(dir, "prompt.md"), "utf8");
  return expandPromptPlaceholders(template, vars) + workAppendix();
}

export type CreatePromptVars = {
  branch: string;
  repoRoot: string;
  workspaceDir: string;
};

export function loadCreateAgentPrompt(vars: CreatePromptVars): string {
  return loadAgentPrompt(
    "create",
    { ...vars, defaultPrBodyInstructions },
    loadCreateWorkPromptAppendix,
  );
}

export type UpdatePromptVars = {
  target: string;
  workspaceDir: string;
};

export function loadUpdateAgentPrompt(vars: UpdatePromptVars): string {
  return loadAgentPrompt(
    "update",
    { ...vars, defaultPrBodyInstructions },
    loadUpdateWorkPromptAppendix,
  );
}

export type ReviewPromptVars = {
  target: string;
  workspaceDir: string;
};

export function loadReviewAgentPrompt(vars: ReviewPromptVars): string {
  return loadAgentPrompt("review", vars, loadReviewWorkPromptAppendix);
}
