/**
 * `jira show` -- print one issue as markdown (local `jira/` copy when present).
 */
import fs from "node:fs";
import process from "node:process";

import { viewWorkitem } from "../../lib/acli-jira.ts";
import { flagBool, parseSubcommandArgv } from "../../lib/argv.ts";
import { CONFIG } from "../../lib/CONFIG.ts";
import { formatTicketMarkdown, jiraPullFields, normalizeSiteHost } from "../../lib/format.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import { localTicketPath } from "../../lib/local.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** Load local ticket markdown when present and remote was not requested. */
export function readLocalShowMarkdown(
  key: string,
  options: {
    cwd?: string;
    remote?: boolean;
    fieldsExplicit?: boolean;
  } = {}
): { path: string; markdown: string } | null {
  if (options.remote || options.fieldsExplicit) return null;
  const filePath = localTicketPath(key, options.cwd ?? process.cwd());
  if (!filePath) return null;
  return {
    path: filePath,
    markdown: fs.readFileSync(filePath, "utf-8")
  };
}

/** Run `jira show <KEY|URL> [--fields ...] [--remote]`. */
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

  const fieldsExplicit = parsed.flags.has("fields");
  const fields = fieldsExplicit
    ? String(parsed.flags.get("fields"))
    : jiraPullFields();
  const remote = flagBool(parsed.flags, "remote");

  const local = readLocalShowMarkdown(key, { remote, fieldsExplicit });
  if (local) {
    const body = local.markdown.endsWith("\n")
      ? local.markdown
      : `${local.markdown}\n`;
    if (isJsonMode(options)) {
      printJsonSuccess({
        source: "local",
        key,
        path: local.path,
        markdown: body
      });
      return 0;
    }
    process.stdout.write(body);
    return 0;
  }

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
