/// <reference types="node" />

/**
 * Wraps Cursor Agent: markdown templates under `prompts/` (default `pr` reuses review vs update).
 */
import process from "node:process";

import { runOpenAgentCapture, spawnAgentInherit } from "./agent.ts";
import { parseArgs } from "./args.ts";
import {
  ghPrCreateFromPayload,
  jiraTitleKeyFromEnv,
  prTitleMatchesJiraKey,
} from "./gh.ts";
import {
  buildCreatePrPrompt,
  buildReviewCmdPrompt,
  buildUpdateCmdPrompt,
  promptPath,
  reviewAgentTemplate,
} from "./prompts.ts";
import { extractPrPayloadFromAgentOutput, waitEnterOrEscape } from "./open.ts";
import { writeStateEntry } from "./state.ts";

function formatErr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  const jiraTitleKey = jiraTitleKeyFromEnv();

  if (parsed.mode !== "open" && jiraTitleKey && parsed.pr) {
    const title = parsed.prTitle;
    if (title === null) {
      process.stderr.write(
        "pr: internal error: missing PR title after gh pr view\n",
      );
      process.exit(1);
    }
    if (!prTitleMatchesJiraKey(title, jiraTitleKey)) {
      process.stderr.write(
        `pr: PR title must start with "${jiraTitleKey}-<issue number>" (got: ${JSON.stringify(title)})\n`,
      );
      process.exit(1);
    }
  }

  let prompt: string;
  if (parsed.mode === "open") {
    try {
      prompt = buildCreatePrPrompt(parsed.ticket, jiraTitleKey);
    } catch (e) {
      process.stderr.write(
        `pr: cannot read ${promptPath("create")}: ${formatErr(e)}\n`,
      );
      process.exit(1);
    }

    let combined: string;
    try {
      combined = await runOpenAgentCapture(parsed.workspace, prompt);
    } catch (e) {
      process.stderr.write(`pr: ${formatErr(e)}\n`);
      process.exit(1);
    }

    let payload: { title: string; body: string };
    try {
      payload = extractPrPayloadFromAgentOutput(combined);
    } catch (e) {
      process.stderr.write(`pr: ${formatErr(e)}\n`);
      process.exit(1);
    }

    if (!process.stdin.isTTY || !process.stdout.isTTY) {
      process.stderr.write(
        "pr: create-pr flow needs an interactive terminal (TTY) to preview title/body and confirm with ENTER / ESC\n",
      );
      process.exit(1);
    }

    process.stdout.write(`\n\x1b[1mPR title\x1b[0m\n${payload.title}\n\n`);
    process.stdout.write(`\x1b[1mPR body (markdown)\x1b[0m\n${payload.body}\n\n`);
    process.stdout.write(
      "\x1b[36m────────────────────────────────\x1b[0m\n",
    );
    process.stdout.write(
      "\x1b[33mENTER\x1b[0m → run `gh pr create`    \x1b[33mESC\x1b[0m → cancel\n",
    );

    let choice: "enter" | "escape";
    try {
      choice = await waitEnterOrEscape();
    } catch (e) {
      process.stderr.write(`pr: ${formatErr(e)}\n`);
      process.exit(1);
    }
    if (choice === "escape") {
      process.stderr.write("pr: cancelled (no PR created)\n");
      process.exit(1);
    }
    ghPrCreateFromPayload(parsed.workspace, payload.title, payload.body);
    process.exit(0);
  }

  const tmpl = reviewAgentTemplate(parsed);
  try {
    prompt =
      tmpl === "review"
        ? buildReviewCmdPrompt(parsed.pr, parsed.hint, jiraTitleKey)
        : buildUpdateCmdPrompt(parsed.pr, parsed.hint, jiraTitleKey);
  } catch (e) {
    process.stderr.write(
      `pr: cannot read ${promptPath(tmpl)}: ${formatErr(e)}\n`,
    );
    process.exit(1);
  }

  const agentArgs = ["--trust", "--workspace", parsed.workspace, prompt];

  let code: number;
  try {
    code = await spawnAgentInherit(agentArgs);
  } catch (e) {
    process.stderr.write(`pr: failed to start agent: ${formatErr(e)}\n`);
    process.exit(1);
  }
  if (code === 0 && parsed.stateKey && parsed.headOid) {
    writeStateEntry(parsed.stateKey, parsed.headOid);
  }
  process.exit(code);
}

main().catch((e) => {
  process.stderr.write(`${formatErr(e)}\n`);
  process.exit(1);
});
