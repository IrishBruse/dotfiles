import readline from "node:readline";
import process from "node:process";

import { markdownToAnsi } from "./markdown.ts";

function parseAgentJsonObject(text: string): Record<string, unknown> {
  const marker = "```json";
  const open = text.lastIndexOf(marker);
  if (open === -1) {
    throw new Error("expected a ```json … ``` block in agent output");
  }
  const nl = text.indexOf("\n", open);
  const contentStart = nl === -1 ? open + marker.length : nl + 1;
  const close = text.indexOf("```", contentStart);
  if (close === -1) {
    throw new Error("unclosed ```json fence");
  }
  const inner = text.slice(contentStart, close).trim();
  let j: unknown;
  try {
    j = JSON.parse(inner);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`invalid JSON inside fence: ${msg}`);
  }
  if (!j || typeof j !== "object" || Array.isArray(j)) {
    throw new Error("JSON root must be an object");
  }
  return j as Record<string, unknown>;
}

export function extractPrPayloadFromAgentOutput(text: string): {
  title: string;
  body: string;
} {
  const o = parseAgentJsonObject(text);
  if (typeof o.title !== "string" || typeof o.body !== "string") {
    throw new Error('JSON must include string fields "title" and "body"');
  }
  return { title: o.title, body: o.body };
}

/** Same JSON as create, plus optional `pr` when the CLI was started without a PR ref. */
export function extractReviewPayloadFromAgentOutput(text: string): {
  title: string;
  body: string;
  pr: string | null;
} {
  const o = parseAgentJsonObject(text);
  if (typeof o.title !== "string" || typeof o.body !== "string") {
    throw new Error('JSON must include string fields "title" and "body"');
  }
  const pr =
    typeof o.pr === "string" && o.pr.trim() ? o.pr.trim() : null;
  return { title: o.title, body: o.body, pr };
}

export function waitEnterOrEscape(): Promise<"enter" | "escape"> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY || !process.stdout.isTTY) {
      reject(new Error("stdin and stdout must be TTYs"));
      return;
    }
    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) stdin.setRawMode(true);
    const cleanup = () => {
      if (stdin.isTTY) stdin.setRawMode(false);
      stdin.removeListener("keypress", onKey);
    };
    const onKey = (_str: string, key: readline.Key) => {
      if (!key) return;
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve("enter");
      } else if (key.name === "escape") {
        cleanup();
        resolve("escape");
      }
    };
    stdin.on("keypress", onKey);
  });
}

export async function ttyConfirmMarkdownSubmit(opts: {
  titleLabel: string;
  titleMarkdown: string;
  bodyLabel: string;
  bodyMarkdown: string;
  enterHint: string;
  cancelMessage: string;
}): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("stdin and stdout must be TTYs");
  }

  process.stdout.write(`\n\x1b[1m${opts.titleLabel}\x1b[0m\n`);
  process.stdout.write(`${markdownToAnsi(opts.titleMarkdown)}\n\n`);
  process.stdout.write(`\x1b[1m${opts.bodyLabel}\x1b[0m\n`);
  process.stdout.write(`${markdownToAnsi(opts.bodyMarkdown)}\n\n`);
  process.stdout.write(
    "\x1b[36m────────────────────────────────\x1b[0m\n",
  );
  process.stdout.write(`${opts.enterHint}\n`);

  const choice = await waitEnterOrEscape();
  if (choice === "escape") {
    process.stderr.write(`${opts.cancelMessage}\n`);
    return false;
  }
  return true;
}
