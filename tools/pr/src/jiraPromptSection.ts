import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  collectJiraKeyMarkdownFiles,
  readJiraSkillBoardText,
} from "./jiraSkillContext.ts";
import {
  formatBundledPrefetchForPrompt,
  type PrPromptWorkspaceMode,
} from "./prPromptWorkspaceFiles.ts";

const TEMPLATE_CANDIDATES = [
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/pull_request_template.md",
  "docs/pull_request_template.md",
] as const;

export function readRepoPrTemplate(repoRoot: string): string {
  for (const rel of TEMPLATE_CANDIDATES) {
    const p = path.join(repoRoot, rel);
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, "utf8");
    }
  }
  return "";
}

/** Markdown block for Jira board + ticket copies, or empty when nothing to attach. */
export function buildJiraPromptSection(
  prTitle: string,
  prBody: string,
  mode: PrPromptWorkspaceMode,
): string {
  const files: Record<string, string> = {};
  const board = readJiraSkillBoardText();
  if (board !== null) {
    files["jira-tickets-board.md"] = board;
  }
  Object.assign(files, collectJiraKeyMarkdownFiles(prTitle, prBody));
  if (Object.keys(files).length === 0) {
    return "";
  }
  return `\n\n## Jira context\n\n${formatBundledPrefetchForPrompt(files, mode)}`;
}

export function ghPrTitleBody(
  target: string,
  repoRoot: string,
): { title: string; body: string } {
  const r = spawnSync("gh", ["pr", "view", target, "--json", "title,body"], {
    encoding: "utf8",
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const msg = (r.stderr ?? r.stdout ?? "").trim() || `exit ${r.status}`;
    throw new Error(`gh pr view ${target}: ${msg}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(r.stdout ?? "{}");
  } catch {
    throw new Error(`gh pr view ${target}: could not parse JSON`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`gh pr view ${target}: unexpected JSON`);
  }
  const o = parsed as { title?: unknown; body?: unknown };
  const title = typeof o.title === "string" ? o.title : "";
  const body =
    typeof o.body === "string"
      ? o.body
      : o.body == null
        ? ""
        : String(o.body);
  return { title, body };
}
