import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

/**
 * When **`PR_CLI_WORK=true`**, **`pr create`** and **`pr update`** require the GitHub PR title
 * to start with **`NOVACORE-<digits>`**. Work-only prompt appendices live beside each command’s **`prompt.md`**:
 * **`commands/create/prompt.work.md`**, **`commands/update/prompt.work.md`**, **`commands/review/prompt.work.md`**.
 * Unset or any other value — no check and no work prompt appendix.
 */
export const PR_WORK_JIRA_KEY = "NOVACORE";

const policyDir = path.dirname(fileURLToPath(import.meta.url));

export function isPrCliWork(): boolean {
  return process.env.PR_CLI_WORK === "true";
}

type WorkPromptKind = "create" | "update" | "review";

const cachedWorkPrompts = new Map<WorkPromptKind, string>();

function normalizeWorkMarkdown(s: string): string {
  return s.endsWith("\n") ? s : `${s}\n`;
}

function loadWorkPromptAppendix(kind: WorkPromptKind): string {
  if (!isPrCliWork()) {
    return "";
  }
  let cached = cachedWorkPrompts.get(kind);
  if (cached === undefined) {
    const p = path.join(policyDir, "commands", kind, "prompt.work.md");
    if (!fs.existsSync(p)) {
      throw new Error(`pr: PR_CLI_WORK=true but missing ${p}`);
    }
    cached = fs.readFileSync(p, "utf8");
    cachedWorkPrompts.set(kind, cached);
  }
  return normalizeWorkMarkdown(cached);
}

/** Markdown appended to create agent prompt when {@link isPrCliWork}. */
export function loadCreateWorkPromptAppendix(): string {
  return loadWorkPromptAppendix("create");
}

/** Markdown appended to update agent prompt when {@link isPrCliWork}. */
export function loadUpdateWorkPromptAppendix(): string {
  return loadWorkPromptAppendix("update");
}

/** Markdown appended to review agent prompt when {@link isPrCliWork}. */
export function loadReviewWorkPromptAppendix(): string {
  return loadWorkPromptAppendix("review");
}

export function assertPrTitleMatchesJiraPolicy(title: string): void {
  if (!isPrCliWork()) {
    return;
  }
  const escaped = PR_WORK_JIRA_KEY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${escaped}-\\d+`);
  const t = title.trim();
  if (!re.test(t)) {
    throw new Error(
      `pr: PR title must start with ${PR_WORK_JIRA_KEY}-<digits> when PR_CLI_WORK=true (got: ${JSON.stringify(t)})`,
    );
  }
}
