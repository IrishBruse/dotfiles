import fs from "node:fs";
import { fileURLToPath } from "node:url";

import type { Parsed } from "./types.ts";

/** On-disk templates passed to `agent` (default `pr` maps to review vs update from state). */
export type AgentPromptFile = "review" | "update" | "create";

const PROMPT_REL: Record<AgentPromptFile, string> = {
  review: "../prompts/review.md",
  update: "../prompts/update.md",
  create: "../prompts/create.md",
};

/** Which review/update markdown default `pr` and explicit subcommands use. */
export function reviewAgentTemplate(parsed: Parsed): "review" | "update" {
  if (parsed.command === "update") return "update";
  if (parsed.command === "review") return "review";
  return parsed.mode === "update" ? "update" : "review";
}

/** Replace `{{name}}` placeholders (ASCII word keys only). */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function readUtf8(rel: string): string {
  return fs.readFileSync(
    fileURLToPath(new URL(rel, import.meta.url)),
    "utf8",
  );
}

export function promptPath(id: AgentPromptFile): string {
  return fileURLToPath(new URL(PROMPT_REL[id], import.meta.url));
}

function prLine(pr: string | null): string {
  return pr
    ? `Target pull request: ${pr} (number for the current repo, org/repo#n, or a github.com pull URL — trailing /files, ?tab=…, etc. are accepted).`
    : "No PR was passed. Run `gh pr list --limit 20` and either ask which PR to review or pick the clearest match after quick confirmation.";
}

function hintBlock(hint: string | null): string {
  return hint ? `\n\nNote: ${hint}` : "";
}

function jiraBlockReview(jiraTitleKey: string | null): string {
  return jiraTitleKey
    ? `\n\nHard requirement (environment PR_TITLE_JIRA_KEY=${jiraTitleKey}): The GitHub pull request title must start with "${jiraTitleKey}-<issue number>" (example: "${jiraTitleKey}-1123") before any other text. If the title does not match, use verdict **Request Changes** and tell the author to rename the PR before merge.`
    : "";
}

function ticketAndPolicyCreate(
  ticket: string | null,
  jiraTitleKey: string | null,
): { ticketLine: string; jiraBlock: string } {
  const ticketLine = ticket
    ? `User supplied Jira ticket reference: ${ticket}. Prefer this for the PR title prefix when it matches the project key.`
    : "No ticket was passed on the CLI; obtain assigned Jira issues via MCP as in the doc, or confirm with the user.";
  const jiraBlock = jiraTitleKey
    ? `\n\nRepository policy (PR_TITLE_JIRA_KEY=${jiraTitleKey}): New PR titles must use "${jiraTitleKey}-<issue number> - <short title>" (space-hyphen-space after the ticket).`
    : "";
  return { ticketLine, jiraBlock };
}

export function buildReviewCmdPrompt(
  pr: string | null,
  hint: string | null,
  jiraTitleKey: string | null,
): string {
  return interpolate(readUtf8(PROMPT_REL.review), {
    prLine: prLine(pr),
    hintBlock: hintBlock(hint),
    jiraBlock: jiraBlockReview(jiraTitleKey),
  });
}

export function buildUpdateCmdPrompt(
  pr: string | null,
  hint: string | null,
  jiraTitleKey: string | null,
): string {
  return interpolate(readUtf8(PROMPT_REL.update), {
    prLine: prLine(pr),
    hintBlock: hintBlock(hint),
    jiraBlock: jiraBlockReview(jiraTitleKey),
  });
}

export function buildCreatePrPrompt(
  ticket: string | null,
  jiraTitleKey: string | null,
): string {
  const { ticketLine, jiraBlock } = ticketAndPolicyCreate(ticket, jiraTitleKey);
  return interpolate(readUtf8(PROMPT_REL.create), {
    ticketLine,
    jiraBlock,
  });
}
