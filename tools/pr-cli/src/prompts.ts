import fs from "node:fs";
import { fileURLToPath } from "node:url";

const REVIEW_PROMPT = "../prompts/review.md";
const OPEN_PROMPT = "../prompts/open.md";

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

export function reviewPromptPath(): string {
  return fileURLToPath(new URL(REVIEW_PROMPT, import.meta.url));
}

export function openPromptPath(): string {
  return fileURLToPath(new URL(OPEN_PROMPT, import.meta.url));
}

export function buildReviewPrompt(
  mode: "add" | "update",
  pr: string | null,
  hint: string | null,
  jiraTitleKey: string | null,
): string {
  const prLine = pr
    ? `Target pull request: ${pr} (number for the current repo, org/repo#n, or a github.com pull URL — trailing /files, ?tab=…, etc. are accepted).`
    : "No PR was passed. Run `gh pr list --limit 20` and either ask which PR to review or pick the clearest match after quick confirmation.";

  const mission =
    mode === "add"
      ? "Do a first-pass review: follow every step in this document (resolve PR, diff, context, analysis, structured feedback). End with an explicit verdict (**Approved** / **Request changes** / **Needs discussion**) and state whether the change is merge-ready from a review perspective."
      : "The PR may have new commits or new threads. Re-fetch diff and review/comment state, then write an updated review: what changed, resolved items, and any new findings. End with an explicit verdict and merge readiness (approve to merge vs blockers).";

  const hintBlock = hint ? `\n\nNote: ${hint}` : "";

  const jiraBlock = jiraTitleKey
    ? `\n\nHard requirement (environment PR_TITLE_JIRA_KEY=${jiraTitleKey}): The GitHub pull request title must start with "${jiraTitleKey}-<issue number>" (example: "${jiraTitleKey}-1123") before any other text. If the title does not match, use verdict **Request Changes** and tell the author to rename the PR before merge.`
    : "";

  return interpolate(readUtf8(REVIEW_PROMPT), {
    prLine,
    mission,
    hintBlock,
    jiraBlock,
  });
}

export function buildOpenPrompt(
  ticket: string | null,
  jiraTitleKey: string | null,
): string {
  const ticketLine = ticket
    ? `User supplied Jira ticket reference: ${ticket}. Prefer this for the PR title prefix when it matches the project key.`
    : "No ticket was passed on the CLI; obtain assigned Jira issues via MCP as in the doc, or confirm with the user.";

  const jiraBlock = jiraTitleKey
    ? `\n\nRepository policy (PR_TITLE_JIRA_KEY=${jiraTitleKey}): New PR titles must use "${jiraTitleKey}-<issue number> - <short title>" (space-hyphen-space after the ticket).`
    : "";

  return interpolate(readUtf8(OPEN_PROMPT), {
    ticketLine,
    jiraBlock,
  });
}
