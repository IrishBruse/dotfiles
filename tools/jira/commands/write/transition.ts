/**
 * `jira transition` -- transition a Jira work item.
 */
import process from "node:process";

import { transitionWorkitem, viewWorkitem } from "../../lib/acli-jira.ts";
import { flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { gatherJiraInfo } from "../../lib/info.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

function statusNameFromView(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  const fields = (data as { fields?: unknown }).fields;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return "";
  const status = (fields as { status?: unknown }).status;
  if (!status || typeof status !== "object" || Array.isArray(status)) return "";
  const name = (status as { name?: unknown }).name;
  return typeof name === "string" ? name.trim() : "";
}

/** Print current status and known board statuses (no acli transition). */
function listTransitionTargets(key: string, options: CommandOptions): number {
  let current = "";
  try {
    current = statusNameFromView(viewWorkitem(key, { fields: "status" }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`transition ${key}: ${msg}`, options.outputMode);
  }

  const statuses = gatherJiraInfo().statuses;
  if (isJsonMode(options)) {
    printJsonSuccess({ key, currentStatus: current, statuses });
    return 0;
  }

  process.stdout.write(`Current: ${current || "(unknown)"}\n`);
  if (statuses.length === 0) {
    process.stdout.write(
      "Known statuses: (none cached — run jira sync, or pass a status)\n"
    );
  } else {
    process.stdout.write(`Known statuses:\n`);
    for (const name of statuses) {
      process.stdout.write(`  ${name}\n`);
    }
  }
  process.stdout.write(
    `Usage: jira transition ${key} <Status>\n`
  );
  return 0;
}

/** Run `jira transition <KEY> [<Status>]` (`--status` alias supported). */
export function runTransitionCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("transition: missing Jira key", options.outputMode);
  }

  const key = parseJiraKey(input) ?? input;
  const status =
    (parsed.positional[1]?.trim() || flagString(parsed.flags, "status")).trim();
  if (!status) {
    return listTransitionTargets(key, options);
  }

  try {
    transitionWorkitem({ key, status });
    if (isJsonMode(options)) {
      printJsonSuccess({ key, action: "transition", status });
    } else {
      process.stdout.write(`Transitioned ${key} to ${status}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`transition ${key}: ${msg}`, options.outputMode);
  }
}
