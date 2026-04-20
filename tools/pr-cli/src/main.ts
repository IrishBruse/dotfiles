/// <reference types="node" />

/**
 * Wraps Cursor Agent: skills/review.md (review flows) or skills/create.md (`pr open` and `add`/`new`/`create`).
 */
import process from "node:process";

import { runOpenAgentCapture, spawnAgentInherit } from "./agent.ts";
import { parseArgs } from "./args.ts";
import {
  ghPrCreateFromPayload,
  jiraTitleKeyFromEnv,
  prTitleMatchesJiraKey,
  tryGhPrTitle,
} from "./gh.ts";
import {
  buildOpenPrompt,
  buildReviewPrompt,
  createSkillPath,
  readCreateSkill,
  readReviewSkill,
  reviewSkillPath,
} from "./prompts.ts";
import { extractPrPayloadFromAgentOutput, waitEnterOrEscape } from "./open.ts";
import { writeStateEntry } from "./state.ts";

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  const jiraTitleKey = jiraTitleKeyFromEnv();

  if (parsed.mode !== "open" && jiraTitleKey && parsed.pr) {
    const title = tryGhPrTitle(parsed.workspace, parsed.pr);
    if (title === null) {
      process.stderr.write(
        "pr: gh pr view failed; cannot enforce PR_TITLE_JIRA_KEY\n",
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
      prompt = buildOpenPrompt(
        parsed.ticket,
        readCreateSkill(),
        jiraTitleKey,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`pr: cannot read ${createSkillPath()}: ${msg}\n`);
      process.exit(1);
    }

    let combined: string;
    try {
      combined = await runOpenAgentCapture(
        parsed.workspace,
        parsed.agentForward,
        prompt,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`pr: ${msg}\n`);
      process.exit(1);
    }

    let payload: { title: string; body: string };
    try {
      payload = extractPrPayloadFromAgentOutput(combined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`pr: ${msg}\n`);
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
      const msg = e instanceof Error ? e.message : String(e);
      process.stderr.write(`pr: ${msg}\n`);
      process.exit(1);
    }
    if (choice === "escape") {
      process.stderr.write("pr: cancelled (no PR created)\n");
      process.exit(1);
    }
    ghPrCreateFromPayload(parsed.workspace, payload.title, payload.body);
    process.exit(0);
  }

  let skillBody: string;
  try {
    skillBody = readReviewSkill();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`pr: cannot read ${reviewSkillPath()}: ${msg}\n`);
    process.exit(1);
  }
  prompt = buildReviewPrompt(
    parsed.mode as "add" | "update",
    parsed.pr,
    skillBody,
    parsed.hint,
    jiraTitleKey,
  );

  const agentArgs = ["--trust", "--workspace", parsed.workspace];
  if (parsed.print) agentArgs.push("--print");
  agentArgs.push(...parsed.agentForward, prompt);

  let code: number;
  try {
    code = await spawnAgentInherit(agentArgs);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`pr: failed to start agent: ${msg}\n`);
    process.exit(1);
  }
  if (code === 0 && parsed.stateKey && parsed.headOid) {
    writeStateEntry(parsed.stateKey, parsed.headOid);
  }
  process.exit(code);
}

main().catch((e) => {
  process.stderr.write(`${e}\n`);
  process.exit(1);
});
