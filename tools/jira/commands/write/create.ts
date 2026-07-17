/**
 * `jira create` -- create a Jira work item.
 */
import fs from "node:fs";
import process from "node:process";

import {
  createWorkitem,
  parseCreatedIssueKey
} from "../../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { configuredProject } from "../../lib/CONFIG.ts";
import {
  applyCreateFieldDefaults,
  buildCreateWorkitemJson,
  collectFieldFlags,
  parseFieldFlags,
  writeCreateJsonTemp,
  type CustomFieldValue
} from "../../lib/custom-fields.ts";
import { gatherJiraInfo } from "../../lib/info.ts";
import { parseDraftFrontmatter } from "../../lib/local.ts";
import { prepareAcliDescriptionFileFromPath } from "../../lib/markdown-adf.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";
import { pullTicket } from "../local/pull.ts";

function tryCreate(
  fn: () => { stdout: string },
  pullAfter: boolean,
  options: CommandOptions
): number {
  try {
    return finishCreate(fn().stdout, pullAfter, options);
  } catch (e) {
    return failCommand(
      `create: ${e instanceof Error ? e.message : String(e)}`,
      options.outputMode
    );
  }
}

function createViaJsonTemp(
  json: ReturnType<typeof buildCreateWorkitemJson>,
  pullAfter: boolean,
  options: CommandOptions
): number {
  const { dir, filePath } = writeCreateJsonTemp(json);
  try {
    return tryCreate(() => createWorkitem({ fromJson: filePath }), pullAfter, options);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function parseOptionalNumber(
  raw: string | undefined,
  label: string
): number | undefined {
  if (raw === undefined || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new Error(`${label} must be a number`);
  }
  return n;
}

function resolveCustomFields(
  argv: string[],
  parsed: ReturnType<typeof parseSubcommandArgv>,
  project: string,
  issueType: string
): Record<string, CustomFieldValue> {
  const info = gatherJiraInfo();
  // Board sprint on by default; --no-board-defaults opts out.
  // --board-defaults is accepted as a no-op alias.
  const boardDefaults = !flagBool(parsed.flags, "no-board-defaults");
  const sprintId = parseOptionalNumber(
    flagString(parsed.flags, "sprint"),
    "--sprint"
  );
  const storyPoints = parseOptionalNumber(
    flagString(parsed.flags, "story-points"),
    "--story-points"
  );

  return applyCreateFieldDefaults(parseFieldFlags(collectFieldFlags(argv)), {
    source: {
      featureTeamField: info.featureTeamField,
      featureTeamOptionId: info.featureTeamOptionId,
      sprintField: info.sprintField,
      storyPointsField: info.storyPointsField,
      sprints: info.sprints
    },
    project,
    issueType,
    boardDefaults,
    sprintId,
    storyPoints
  });
}

/** Run `jira create` with flags or `--from-draft`. */
export function runCreateCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const pullAfter = !flagBool(parsed.flags, "no-pull");
  const fromJson = flagString(parsed.flags, "from-json");
  const fromDraft = flagString(parsed.flags, "from-draft");

  if (fromJson) {
    return tryCreate(() => createWorkitem({ fromJson }), pullAfter, options);
  }
  if (fromDraft) {
    return createFromDraft(fromDraft, parsed, argv, pullAfter, options);
  }

  const project = configuredProject();
  const type = flagString(parsed.flags, "type");
  const summary = flagString(parsed.flags, "summary");
  if (!summary) {
    return failCommand("create: --summary is required", options.outputMode);
  }
  if (!project) {
    return failCommand(
      "create: set project in ~/.config/jira/config.json (or use jira acli)",
      options.outputMode
    );
  }
  if (!type) {
    return failCommand("create: --type is required", options.outputMode);
  }

  const descriptionFile = flagString(parsed.flags, "description-file");
  const parent = flagString(parsed.flags, "parent");
  const labelsRaw = flagString(parsed.flags, "label");
  const labels = labelsRaw ? labelsRaw.split(",").map((s) => s.trim()) : [];

  let customFields: Record<string, CustomFieldValue>;
  try {
    customFields = resolveCustomFields(argv, parsed, project, type);
  } catch (e) {
    return failCommand(
      `create: ${e instanceof Error ? e.message : String(e)}`,
      options.outputMode
    );
  }

  const description = descriptionFile
    ? fs.readFileSync(descriptionFile, "utf-8")
    : undefined;

  if (Object.keys(customFields).length > 0) {
    return createViaJsonTemp(
      buildCreateWorkitemJson({
        project,
        issueType: type,
        summary,
        description,
        parent: parent || undefined,
        labels: labels.length ? labels : undefined,
        customFields
      }),
      pullAfter,
      options
    );
  }

  return tryCreate(
    () => {
      let descriptionPath = descriptionFile || undefined;
      let descDir: string | undefined;
      if (descriptionFile) {
        const prepared = prepareAcliDescriptionFileFromPath(descriptionFile);
        descDir = prepared.dir;
        descriptionPath = prepared.filePath;
      }
      try {
        return createWorkitem({
          project,
          type,
          summary,
          descriptionFile: descriptionPath,
          parent: parent || undefined,
          labels: labels.length ? labels : undefined
        });
      } finally {
        if (descDir) {
          fs.rmSync(descDir, { recursive: true, force: true });
        }
      }
    },
    pullAfter,
    options
  );
}

function createFromDraft(
  draftPath: string,
  parsed: ReturnType<typeof parseSubcommandArgv>,
  argv: string[],
  pullAfter: boolean,
  options: CommandOptions
): number {
  if (!fs.existsSync(draftPath)) {
    return failCommand(`create: draft not found: ${draftPath}`, options.outputMode);
  }

  const content = fs.readFileSync(draftPath, "utf-8");
  const draft = parseDraftFrontmatter(content);
  if (!draft) {
    return failCommand(
      `create: could not parse draft frontmatter: ${draftPath}`,
      options.outputMode
    );
  }

  const project = draft.project.trim() || configuredProject();
  const type = flagString(parsed.flags, "type", draft.issueType);
  const summary = flagString(parsed.flags, "summary", draft.title);
  const parent = flagString(parsed.flags, "parent", draft.parent);

  if (!project || !type || !summary) {
    return failCommand("create: draft missing project, type, or title", options.outputMode);
  }

  let customFields: Record<string, CustomFieldValue>;
  try {
    customFields = resolveCustomFields(argv, parsed, project, type);
  } catch (e) {
    return failCommand(
      `create: ${e instanceof Error ? e.message : String(e)}`,
      options.outputMode
    );
  }

  return createViaJsonTemp(
    buildCreateWorkitemJson({
      project,
      issueType: type,
      summary,
      description: draft.description,
      parent: parent && parent !== "None" ? parent : undefined,
      customFields
    }),
    pullAfter,
    options
  );
}

function finishCreate(
  stdout: string,
  pullAfter: boolean,
  options: CommandOptions
): number {
  const key = parseCreatedIssueKey(stdout);
  if (key) {
    if (isJsonMode(options)) {
      printJsonSuccess({ key, action: "create" });
    } else {
      process.stdout.write(`${key}\n`);
    }
    if (pullAfter) {
      return pullTicket(key, { outputMode: options.outputMode, quiet: isJsonMode(options) });
    }
    return 0;
  }
  if (stdout.trim()) {
    if (isJsonMode(options)) {
      printJsonSuccess({ action: "create", stdout: stdout.trim() });
    } else {
      process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
    }
  }
  return 0;
}
