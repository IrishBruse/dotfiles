/**
 * `jira create` -- create a Jira work item.
 */
import fs from "node:fs";
import process from "node:process";

import {
  createWorkitem,
  parseCreatedIssueKey
} from "../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../lib/argv.ts";
import {
  NOVACORE_CAPITALIZABLE_FIELD,
  buildCreateWorkitemJson,
  capitalizableYesField,
  parseFieldFlags,
  writeCreateJsonTemp
} from "../lib/custom-fields.ts";
import { parseDraftFrontmatter } from "../lib/local.ts";
import { printError } from "../lib/output.ts";
import { pullTicket } from "./pull.ts";

function collectFieldFlags(argv: string[]): string[] {
  const fields: string[] = [];
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--field" && argv[i + 1]) {
      fields.push(argv[i + 1]!);
      i += 1;
    }
  }
  return fields;
}

/** Run `jira create` with flags or `--from-draft`. */
export function runCreateCommand(argv: string[]): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const fromDraft = flagString(parsed.flags, "from-draft");
  const fromJson = flagString(parsed.flags, "from-json");
  const yes = flagBool(parsed.flags, "yes");
  const pullAfter = !flagBool(parsed.flags, "no-pull");

  if (fromJson) {
    return runCreateFromJson(fromJson, yes, pullAfter);
  }

  if (fromDraft) {
    return runCreateFromDraft(fromDraft, parsed, argv, yes, pullAfter);
  }

  const project = flagString(parsed.flags, "project");
  const type = flagString(parsed.flags, "type");
  const summary = flagString(parsed.flags, "summary");
  const descriptionFile = flagString(parsed.flags, "description-file");
  const parent = flagString(parsed.flags, "parent");
  const labelsRaw = flagString(parsed.flags, "label");
  const labels = labelsRaw ? labelsRaw.split(",").map((s) => s.trim()) : [];
  const customFields = parseFieldFlags(collectFieldFlags(argv));

  if (!project || !type || !summary) {
    printError("create: --project, --type, and --summary are required");
    return 1;
  }

  const needsJson = Object.keys(customFields).length > 0;
  if (needsJson) {
    const description = descriptionFile
      ? fs.readFileSync(descriptionFile, "utf-8")
      : undefined;
    const json = buildCreateWorkitemJson({
      project,
      issueType: type,
      summary,
      description,
      parent: parent || undefined,
      labels: labels.length ? labels : undefined,
      customFields
    });
    const { dir, filePath } = writeCreateJsonTemp(json);
    try {
      return runCreateFromJson(filePath, yes, pullAfter);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  try {
    const result = createWorkitem({
      project,
      type,
      summary,
      descriptionFile: descriptionFile || undefined,
      parent: parent || undefined,
      labels: labels.length ? labels : undefined,
      yes
    });
    return finishCreate(result.stdout, pullAfter);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`create: ${msg}`);
    return 1;
  }
}

function runCreateFromJson(
  fromJson: string,
  yes: boolean,
  pullAfter: boolean
): number {
  try {
    const result = createWorkitem({ fromJson, yes });
    return finishCreate(result.stdout, pullAfter);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`create: ${msg}`);
    return 1;
  }
}

function runCreateFromDraft(
  draftPath: string,
  parsed: ReturnType<typeof parseSubcommandArgv>,
  argv: string[],
  yes: boolean,
  pullAfter: boolean
): number {
  if (!fs.existsSync(draftPath)) {
    printError(`create: draft not found: ${draftPath}`);
    return 1;
  }

  const content = fs.readFileSync(draftPath, "utf-8");
  const draft = parseDraftFrontmatter(content);
  if (!draft) {
    printError(`create: could not parse draft frontmatter: ${draftPath}`);
    return 1;
  }

  const project = flagString(parsed.flags, "project", draft.project);
  const type = flagString(parsed.flags, "type", draft.issueType);
  const summary = flagString(parsed.flags, "summary", draft.title);
  const parent = flagString(parsed.flags, "parent", draft.parent);

  if (!project || !type || !summary) {
    printError("create: draft missing project, type, or title");
    return 1;
  }

  const customFields = parseFieldFlags(collectFieldFlags(argv));
  const issueTypeLower = type.toLowerCase();
  if (
    issueTypeLower === "epic" &&
    project.toUpperCase() === "NOVACORE" &&
    !customFields[NOVACORE_CAPITALIZABLE_FIELD]
  ) {
    Object.assign(customFields, capitalizableYesField());
  }

  const json = buildCreateWorkitemJson({
    project,
    issueType: type,
    summary,
    description: draft.description,
    parent: parent && parent !== "None" ? parent : undefined,
    customFields
  });

  const { dir, filePath } = writeCreateJsonTemp(json);
  try {
    return runCreateFromJson(filePath, yes, pullAfter);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function finishCreate(stdout: string, pullAfter: boolean): number {
  const key = parseCreatedIssueKey(stdout);
  if (key) {
    process.stdout.write(`${key}\n`);
    if (pullAfter) {
      return pullTicket(key);
    }
    return 0;
  }
  if (stdout.trim()) {
    process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
  }
  return 0;
}
