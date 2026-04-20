import fs from "node:fs";
import { fileURLToPath } from "node:url";

/** Replace `{{name}}` placeholders (ASCII word keys only). */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

function readPromptTemplate(rel: string): string {
  return fs.readFileSync(
    fileURLToPath(new URL(rel, import.meta.url)),
    "utf8",
  );
}

export function reviewSkillPath(): string {
  return fileURLToPath(new URL("../skills/review.md", import.meta.url));
}

export function readReviewSkill(): string {
  return fs.readFileSync(reviewSkillPath(), "utf8");
}

export function createSkillPath(): string {
  return fileURLToPath(new URL("../skills/create.md", import.meta.url));
}

export function readCreateSkill(): string {
  return fs.readFileSync(createSkillPath(), "utf8");
}

export function buildReviewPrompt(
  mode: "add" | "update",
  pr: string | null,
  skillBody: string,
  hint: string | null,
  jiraTitleKey: string | null,
): string {
  const prLine = pr
    ? `Target pull request: ${pr} (number for the current repo, org/repo#n, or a github.com pull URL — trailing /files, ?tab=…, etc. are accepted).`
    : "No PR was passed. Run `gh pr list --limit 20` and either ask which PR to review or pick the clearest match after quick confirmation.";

  const mission =
    mode === "add"
      ? "Do a first-pass review: follow every step in the injected doc (resolve PR, diff, context, analysis, structured feedback). End with an explicit verdict (**Approved** / **Request changes** / **Needs discussion**) and state whether the change is merge-ready from a review perspective."
      : "The PR may have new commits or new threads. Re-fetch diff and review/comment state, then write an updated review: what changed, resolved items, and any new findings. End with an explicit verdict and merge readiness (approve to merge vs blockers).";

  const hintBlock = hint ? `\n\nNote: ${hint}` : "";

  const jiraBlock = jiraTitleKey
    ? `\n\nHard requirement (environment PR_TITLE_JIRA_KEY=${jiraTitleKey}): The GitHub pull request title must start with "${jiraTitleKey}-<issue number>" (example: "${jiraTitleKey}-1123") before any other text. If the title does not match, use verdict **Request Changes** and tell the author to rename the PR before merge.`
    : "";

  return interpolate(readPromptTemplate("../prompts/review.md"), {
    prLine,
    mission,
    hintBlock,
    jiraBlock,
    skillBody,
  });
}

const CREATE_JSON_SUFFIX = `

## Final response (required)
When the PR title and body are ready for GitHub, your **last** message must contain **only** one markdown fenced code block tagged \`json\` with exactly this shape (valid JSON strings; use \\n inside \`body\` for newlines if you emit a single-line string):

\`\`\`json
{"title":"NOVACORE-1 - Example title","body":"## Summary\\n\\n…markdown…"}
\`\`\`

Do not write anything after the closing \`\`\` line. The CLI parses this block and, after the user confirms in the terminal, runs \`gh pr create\`.
`;

export function buildOpenPrompt(
  ticket: string | null,
  skillBody: string,
  jiraTitleKey: string | null,
): string {
  const ticketLine = ticket
    ? `User supplied Jira ticket reference: ${ticket}. Prefer this for the PR title prefix when it matches the project key.`
    : "No ticket was passed on the CLI; obtain assigned Jira issues via MCP as in the doc, or confirm with the user.";

  const jiraBlock = jiraTitleKey
    ? `\n\nRepository policy (PR_TITLE_JIRA_KEY=${jiraTitleKey}): New PR titles must use "${jiraTitleKey}-<issue number> - <short title>" (space-hyphen-space after the ticket).`
    : "";

  return (
    interpolate(readPromptTemplate("../prompts/create.md"), {
      ticketLine,
      jiraBlock,
      skillBody,
    }) + CREATE_JSON_SUFFIX
  );
}
