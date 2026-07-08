/**
 * `jira push` -- push local ticket markdown back to Jira.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { runAcli } from "../../.lib/acli.ts";
import { createConcurrencyLimiter } from "../../.lib/concurrency.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import {
  buildLocalTicketIndex,
  listLocalTickets,
  localTicketPath,
  parseTicketMarkdown
} from "../lib/local.ts";
import { printError } from "../lib/output.ts";
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
    runAcli([
      "jira",
      "workitem",
      "edit",
      "--key",
      ticket.key,
      "--summary",
      ticket.title,
      "--description-file",
      descFile,
      "--yes"
    ]);
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
  options: { quiet?: boolean } = {}
): number {
  try {
    const ticketIndex = buildLocalTicketIndex(cwd);
    const filePath = localTicketPath(key, cwd, ticketIndex);
    if (!filePath) {
      printError(`no local file for ${key}`);
      return 1;
    }
    pushTicketFile(filePath, ticketIndex, cwd);
    if (!options.quiet) {
      process.stdout.write(`Pushed ${key} to Jira\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(msg);
    return 1;
  }
}

/** Push every local ticket under `jira/` to Jira. */
export async function pushAll(
  cwd = process.cwd(),
  options: { quiet?: boolean } = {}
): Promise<number> {
  const tickets = listLocalTickets(cwd);
  if (tickets.length === 0) {
    printError("no tickets under jira/");
    return 1;
  }

  const ticketIndex = buildLocalTicketIndex(cwd);
  const limit = createConcurrencyLimiter(PUSH_CONCURRENCY);
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
    if (!options.quiet) {
      process.stdout.write(`Pushed ${result.key}\n`);
    }
  }
  return code;
}

/** Run `jira push [KEY]`. */
export async function runPushCommand(argv: string[]): Promise<number> {
  const input = argv[3];
  if (!input) {
    return pushAll();
  }
  const key = parseJiraKey(input);
  if (!key) {
    printError(`push: not a valid Jira key: ${input}`);
    return 1;
  }
  return pushTicket(key);
}
