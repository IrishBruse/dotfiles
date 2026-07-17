/**
 * `jira show` -- print one issue as markdown with frontmatter (no local file write).
 */
import process from "node:process";

import { viewWorkitem } from "../../lib/acli-jira.ts";
import { parseSubcommandArgv } from "../../lib/argv.ts";
import { CONFIG } from "../../lib/CONFIG.ts";
import { formatTicketMarkdown, jiraPullFields, normalizeSiteHost } from "../../lib/format.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** Run `jira show <KEY|URL> [--fields ...]`. */
export function runShowCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("show: missing Jira key or URL", options.outputMode);
  }

  const key = parseJiraKey(input);
  if (!key) {
    return failCommand(
      `show: not a valid Jira key or URL: ${input}`,
      options.outputMode
    );
  }

  const fields =
    typeof parsed.flags.get("fields") === "string"
      ? String(parsed.flags.get("fields"))
      : jiraPullFields();

  try {
    const data = viewWorkitem(key, { fields });
    if (isJsonMode(options)) {
      printJsonSuccess(data);
      return 0;
    }

    if (!data || typeof data !== "object") {
      return failCommand(
        `show ${key}: no data returned`,
        options.outputMode
      );
    }

    const issue = data as { key?: string; fields?: Record<string, unknown> };
    const issueKey = issue.key ?? key;
    const body = formatTicketMarkdown(
      issueKey,
      issue.fields ?? {},
      normalizeSiteHost(CONFIG.site),
      CONFIG.meAccountId
    ).body;
    process.stdout.write(body.endsWith("\n") ? body : `${body}\n`);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`show ${key}: ${msg}`, options.outputMode);
  }
}
