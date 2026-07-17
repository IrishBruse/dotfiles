/**
 * `jira edit` -- edit a Jira work item.
 */
import fs from "node:fs";
import process from "node:process";

import { editWorkitem } from "../../lib/acli-jira.ts";
import { flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import {
  buildEditWorkitemJson,
  collectFieldFlags,
  parseFieldFlags,
  writeCreateJsonTemp
} from "../../lib/custom-fields.ts";
import { prepareAcliDescriptionFileFromPath } from "../../lib/markdown-adf.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** Run `jira edit <KEY> [flags]`. */
export function runEditCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const input = parsed.positional[0];
  if (!input) {
    return failCommand("edit: missing Jira key", options.outputMode);
  }

  const key = parseJiraKey(input) ?? input;
  const fromJson = flagString(parsed.flags, "from-json");
  const summary = flagString(parsed.flags, "summary");
  const descriptionFile = flagString(parsed.flags, "description-file");
  const labels = flagString(parsed.flags, "labels");
  const customFields = parseFieldFlags(collectFieldFlags(argv));
  const hasCustomFields = Object.keys(customFields).length > 0;

  if (!fromJson && !summary && !descriptionFile && !labels && !hasCustomFields) {
    return failCommand(
      "edit: pass --summary, --description-file, --labels, --field, or --from-json",
      options.outputMode
    );
  }

  try {
    if (fromJson) {
      editWorkitem({ key, fromJson });
    } else if (hasCustomFields) {
      const description = descriptionFile
        ? fs.readFileSync(descriptionFile, "utf-8")
        : undefined;
      const labelList = labels
        ? labels.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined;
      const { dir, filePath } = writeCreateJsonTemp(
        buildEditWorkitemJson({
          key,
          summary: summary || undefined,
          description,
          labels: labelList,
          customFields
        }),
        "jira-edit-"
      );
      try {
        editWorkitem({ key, fromJson: filePath });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } else {
      let descriptionPath = descriptionFile || undefined;
      let descDir: string | undefined;
      if (descriptionFile) {
        const prepared = prepareAcliDescriptionFileFromPath(descriptionFile);
        descDir = prepared.dir;
        descriptionPath = prepared.filePath;
      }
      try {
        editWorkitem({
          key,
          summary: summary || undefined,
          descriptionFile: descriptionPath,
          labels: labels || undefined
        });
      } finally {
        if (descDir) {
          fs.rmSync(descDir, { recursive: true, force: true });
        }
      }
    }
    if (isJsonMode(options)) {
      printJsonSuccess({ key, action: "edit" });
    } else {
      process.stdout.write(`Edited ${key}\n`);
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`edit ${key}: ${msg}`, options.outputMode);
  }
}
