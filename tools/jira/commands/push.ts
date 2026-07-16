/**
 * `jira push` -- push local ticket markdown back to Jira.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { editWorkitem } from "../lib/acli-jira.ts";
import { createConcurrencyLimiter } from "../../.lib/concurrency.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import type { OutputMode } from "../lib/output-mode.ts";
import { isJsonMode } from "../lib/output-mode.ts";
import {
  buildLocalTicketIndex,
  listLocalTickets,
  localTicketPath,
  parseTicketMarkdown
} from "../lib/local.ts";
import { failCommand, printError, printJsonSuccess } from "../lib/output.ts";
import { pullTicketWrite } from "./pull.ts";

const PUSH_CONCURRENCY = 4;

function pushTicketFile(
  filePath: string,
  ticketIndex: Map<string, string>,
  cwd: string
): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const ticket = parseTicketMarkdown(content, filePath);
  if (!ticket) {
    throw new Error(`could not parse ticket markdown: ${filePath}`);
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "jira-push-"));
  const descFile = path.join(tmpDir, "description.md");
  try {
    fs.writeFileSync(descFile, ticket.description, "utf-8");
    editWorkitem({
      key: ticket.key,
      summary: ticket.title,
      descriptionFile: descFile,
      yes: true
    });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  pullTicketWrite(ticket.key, {
    cwd,
    quiet: true,
    noChildren: true,
    ticketIndex
  });
}

/** Push one local ticket to Jira, then refresh the file from Jira. */
export function pushTicket(
  key: string,
  cwd = process.cwd(),
  options: { quiet?: boolean; outputMode?: OutputMode } = {}
): number {
  try {
    const ticketIndex = buildLocalTicketIndex(cwd);
    const filePath = localTicketPath(key, cwd, ticketIndex);
    if (!filePath) {
      return failCommand(`no local file for ${key}`, options.outputMode ?? "human");
    }
    pushTicketFile(filePath, ticketIndex, cwd);
    const jsonMode = isJsonMode({ outputMode: options.outputMode ?? "human" });
    if (jsonMode) {
      printJsonSuccess({ keys: [key], count: 1, action: "push" });
    } else if (!options.quiet) {
      process.stdout.write(`Pushed ${key} to Jira\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(msg, options.outputMode ?? "human");
  }
}

/** Push every local ticket under `jira/` to Jira. */
export async function pushAll(
  cwd = process.cwd(),
  options: { quiet?: boolean; outputMode?: OutputMode } = {}
): Promise<number> {
  const tickets = listLocalTickets(cwd);
  if (tickets.length === 0) {
    return failCommand("no tickets under jira/", options.outputMode ?? "human");
  }

  const ticketIndex = buildLocalTicketIndex(cwd);
  const jsonMode = isJsonMode({ outputMode: options.outputMode ?? "human" });
  const quiet = options.quiet ?? jsonMode;
  const limit = createConcurrencyLimiter(PUSH_CONCURRENCY);
  const pushedKeys: string[] = [];
  const results = await Promise.all(
    tickets.map((ticket) =>
      limit(async () => {
        try {
          pushTicketFile(ticket.path, ticketIndex, cwd);
          return { ok: true as const, key: ticket.key };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          printError(`${ticket.key}: ${msg}`);
          return { ok: false as const };
        }
      })
    )
  );

  let code = 0;
  for (const result of results) {
    if (!result.ok) {
      code = 1;
      continue;
    }
    pushedKeys.push(result.key);
    if (!quiet) {
      process.stdout.write(`Pushed ${result.key}\n`);
    }
  }
  if (jsonMode) {
    printJsonSuccess({ keys: pushedKeys, count: pushedKeys.length, action: "push" });
  }
  return code;
}

/** Run `jira push [KEY]`. */
export async function runPushCommand(
  argv: string[],
  options: { outputMode?: OutputMode } = {}
): Promise<number> {
  const input = argv[3];
  if (!input) {
    return pushAll(undefined, options);
  }
  const key = parseJiraKey(input);
  if (!key) {
    return failCommand(
      `push: not a valid Jira key: ${input}`,
      options.outputMode ?? "human"
    );
  }
  return pushTicket(key, undefined, options);
}
