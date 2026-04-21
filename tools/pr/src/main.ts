/// <reference types="node" />

import process from "node:process";

import { runOpenAgentCapture } from "./agent.ts";
import { parseArgs } from "./args.ts";
import {
  ghPrCreateFromPayload,
  ghPrReviewFromPayload,
  jiraTitleKeyFromEnv,
  normalizePrRef,
  prTitleMatchesJiraKey,
  requireGhPr,
} from "./gh.ts";
import {
  buildCreatePrPrompt,
  buildReviewCmdPrompt,
  buildUpdateCmdPrompt,
  promptPath,
  reviewAgentTemplate,
} from "./prompts.ts";
import {
  extractPrPayloadFromAgentOutput,
  extractReviewPayloadFromAgentOutput,
  ttyConfirmMarkdownSubmit,
} from "./open.ts";
import { writeStateEntry } from "./state.ts";

function formatErr(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function die(message: string, code = 1): never {
  process.stderr.write(message.endsWith("\n") ? message : `${message}\n`);
  process.exit(code);
}

function assertPrTitleMatchesJira(title: string, jiraTitleKey: string): void {
  if (!prTitleMatchesJiraKey(title, jiraTitleKey)) {
    die(
      `pr: PR title must start with "${jiraTitleKey}-<issue number>" (got: ${JSON.stringify(title)})`,
    );
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  const jiraTitleKey = jiraTitleKeyFromEnv();

  if (parsed.mode !== "open" && jiraTitleKey && parsed.pr) {
    const title = parsed.prTitle;
    if (title === null) {
      die("pr: internal error: missing PR title after gh pr view");
    }
    assertPrTitleMatchesJira(title, jiraTitleKey);
  }

  let prompt: string;
  if (parsed.mode === "open") {
    try {
      prompt = buildCreatePrPrompt(parsed.ticket, jiraTitleKey);
    } catch (e) {
      die(`pr: cannot read ${promptPath("create")}: ${formatErr(e)}`);
    }

    let combined: string;
    try {
      combined = await runOpenAgentCapture(parsed.workspace, prompt);
    } catch (e) {
      die(`pr: ${formatErr(e)}`);
    }

    let payload: { title: string; body: string };
    try {
      payload = extractPrPayloadFromAgentOutput(combined);
    } catch (e) {
      die(`pr: ${formatErr(e)}`);
    }

    try {
      const ok = await ttyConfirmMarkdownSubmit({
        titleLabel: "PR title",
        titleMarkdown: payload.title,
        bodyLabel: "PR body (markdown)",
        bodyMarkdown: payload.body,
        enterHint:
          "\x1b[33mENTER\x1b[0m → run `gh pr create`    \x1b[33mESC\x1b[0m → cancel",
        cancelMessage: "pr: cancelled (no PR created)",
      });
      if (!ok) process.exit(1);
    } catch (e) {
      die(
        `pr: create-pr flow needs an interactive terminal (TTY) to preview title/body and confirm with ENTER / ESC: ${formatErr(e)}`,
      );
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
    die(`pr: cannot read ${promptPath(tmpl)}: ${formatErr(e)}`);
  }

  let combined: string;
  try {
    combined = await runOpenAgentCapture(parsed.workspace, prompt);
  } catch (e) {
    die(`pr: ${formatErr(e)}`);
  }

  let payload: { title: string; body: string; pr: string | null };
  try {
    payload = extractReviewPayloadFromAgentOutput(combined);
  } catch (e) {
    die(`pr: ${formatErr(e)}`);
  }

  const effectivePrRaw = (parsed.pr ?? payload.pr)?.trim();
  if (!effectivePrRaw) {
    die(
      'pr: review JSON must include string field "pr" when no PR was passed on the command line',
    );
  }
  const effectivePr = normalizePrRef(effectivePrRaw);

  try {
    const ok = await ttyConfirmMarkdownSubmit({
      titleLabel: "Review title",
      titleMarkdown: payload.title,
      bodyLabel: "Review body (markdown → GitHub comment)",
      bodyMarkdown: payload.body,
      enterHint:
        "\x1b[33mENTER\x1b[0m → run `gh pr review --comment`    \x1b[33mESC\x1b[0m → cancel",
      cancelMessage: "pr: cancelled (no review posted)",
    });
    if (!ok) process.exit(1);
  } catch (e) {
    die(
      `pr: review flow needs an interactive terminal (TTY) to preview and confirm with ENTER / ESC: ${formatErr(e)}`,
    );
  }

  const ghMeta = requireGhPr(parsed.workspace, effectivePr);
  if (jiraTitleKey) {
    assertPrTitleMatchesJira(ghMeta.title, jiraTitleKey);
  }

  ghPrReviewFromPayload(parsed.workspace, effectivePr, payload.body);
  writeStateEntry(ghMeta.key, ghMeta.headOid);
  process.exit(0);
}

main().catch((e) => {
  die(formatErr(e));
});
