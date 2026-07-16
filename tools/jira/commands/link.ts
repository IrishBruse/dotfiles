/**
 * `jira link` -- create a link between work items.
 */
import process from "node:process";

import { createLink } from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import type { CommandOptions } from "../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../lib/output.ts";

/** Run `jira link --out KEY --in KEY --type "..."`. */
export function runLinkCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const fromJson = flagString(parsed.flags, "from-json");
  const out = flagString(parsed.flags, "out");
  const inward = flagString(parsed.flags, "in");
  const type = flagString(parsed.flags, "type");
  const yes = flagBool(parsed.flags, "yes");

  if (!fromJson && (!out || !inward || !type)) {
    return failCommand(
      "link: --out, --in, and --type are required (or --from-json)",
      options.outputMode
    );
  }

  try {
    createLink({
      out,
      in: inward,
      type,
      fromJson: fromJson || undefined,
      yes
    });
    if (isJsonMode(options)) {
      printJsonSuccess(
        fromJson
          ? { action: "link", fromJson: true }
          : { action: "link", out, in: inward, type }
      );
    } else if (fromJson) {
      process.stdout.write("Created link(s)\n");
    } else {
      process.stdout.write(`Linked ${out} -> ${inward} (${type})\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`link: ${msg}`, options.outputMode);
  }
}
