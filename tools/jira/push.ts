import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { runAcli } from "./acli.ts";
import { listLocalTickets, localTicketPath, parseTicketMarkdown } from "./local.ts";
import { pullTicket } from "./pull.ts";
import { printError } from "./output.ts";

function pushTicketFile(filePath: string): void {
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

  pullTicket(ticket.key, { quiet: true, noChildren: true });
}

/** Push one local ticket to Jira, then refresh the file from Jira. */
export function pushTicket(
  key: string,
  cwd = process.cwd(),
  options: { quiet?: boolean } = {}
): number {
  try {
    const filePath = localTicketPath(key, cwd);
    if (!filePath) {
      printError(`no local file for ${key}`);
      return 1;
    }
    pushTicketFile(filePath);
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
export function pushAll(
  cwd = process.cwd(),
  options: { quiet?: boolean } = {}
): number {
  const tickets = listLocalTickets(cwd);
  if (tickets.length === 0) {
    printError("no tickets under jira/");
    return 1;
  }
  let code = 0;
  for (const ticket of tickets) {
    try {
      pushTicketFile(ticket.path);
      if (!options.quiet) {
        process.stdout.write(`Pushed ${ticket.key}\n`);
      }
    } catch (e) {
      code = 1;
      const msg = e instanceof Error ? e.message : String(e);
      printError(`${ticket.key}: ${msg}`);
    }
  }
  return code;
}
