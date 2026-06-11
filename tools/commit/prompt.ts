import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getBranch,
  getGitUserName,
  getStagedDiff,
  getStagedFileList
} from "./git.ts";

function bundledPromptPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "prompt.md");
}

function resolvePromptPath(): string {
  const userPath = join(homedir(), ".config/commit/prompt.md");
  if (existsSync(userPath)) {
    return userPath;
  }
  return bundledPromptPath();
}

function expandPlaceholders(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function buildCommitMsgPrompt(repoRoot: string): string {
  const template = readFileSync(resolvePromptPath(), "utf8");
  const vars = {
    cwd: repoRoot,
    branch: getBranch(repoRoot),
    user: getGitUserName(repoRoot),
    stagedFiles: getStagedFileList(repoRoot),
    stagedDiff: getStagedDiff(repoRoot)
  };
  return expandPlaceholders(template, vars).trimEnd();
}

export function promptPathForHelp(): string {
  const userPath = join(homedir(), ".config/commit/prompt.md");
  if (existsSync(userPath)) {
    return userPath;
  }
  return bundledPromptPath();
}
