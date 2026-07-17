import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { AdfDoc } from "./markdown-adf.ts";
import { markdownToAdf, parseAdfDoc } from "./markdown-adf.ts";
import type { BoardSprint } from "./types.ts";

/**
 * NOVACORE custom field helpers for `acli jira workitem create --from-json`.
 */
export const NOVACORE_FEATURE_TEAM_FIELD = "customfield_10354";

/** Jira Software Sprint field id (common across Cloud sites). */
export const JIRA_SPRINT_FIELD = "customfield_10021";

/** Jira Software Story Points field id (common across Cloud sites). */
export const JIRA_STORY_POINTS_FIELD = "customfield_10023";

/** NOVACORE Capitalizable field id (Epic creates). */
export const NOVACORE_CAPITALIZABLE_FIELD = "customfield_10998";

/** Default Capitalizable option id (Yes) on NOVACORE. */
export const NOVACORE_CAPITALIZABLE_YES_ID = "15465";

/** Link types for `jira link --type` / MCP createIssueLink (omit Polaris noise). */
export const AGENT_LINK_TYPES = [
  "Blocks",
  "Relates",
  "Duplicate",
  "Clones"
] as const;

export type CustomFieldValue =
  | string
  | number
  | boolean
  | { id: string }
  | Array<{ id: string }>;

export type CreateWorkitemJson = {
  fields: Record<string, unknown>;
};

/** acli `workitem edit --from-json` body (flat keys + issues list). */
export type EditWorkitemJson = {
  issues: string[];
  summary?: string;
  description?: AdfDoc;
  labelsToAdd?: string[];
  [customFieldId: string]: unknown;
};

/** Workspace values used to fill Feature Team / sprint on create. */
export type CreateFieldDefaultsSource = {
  featureTeamField: string;
  featureTeamOptionId: string;
  sprintField: string;
  storyPointsField: string;
  sprints: BoardSprint[];
};

/** Build acli create JSON with standard and custom fields. */
export function buildCreateWorkitemJson(options: {
  project: string;
  issueType: string;
  summary: string;
  description?: string;
  parent?: string;
  labels?: string[];
  customFields?: Record<string, CustomFieldValue>;
}): CreateWorkitemJson {
  const fields: Record<string, unknown> = {
    project: { key: options.project },
    issuetype: { name: options.issueType },
    summary: options.summary
  };
  if (options.description) {
    fields.description = descriptionToAdf(options.description);
  }
  if (options.parent) {
    fields.parent = { key: options.parent };
  }
  if (options.labels?.length) {
    fields.labels = options.labels;
  }
  if (options.customFields) {
    for (const [fieldId, value] of Object.entries(options.customFields)) {
      fields[fieldId] = formatCustomFieldValue(fieldId, value);
    }
  }
  return { fields };
}

/** Build acli edit JSON with optional custom fields as top-level keys. */
export function buildEditWorkitemJson(options: {
  key: string;
  summary?: string;
  description?: string;
  labels?: string[];
  customFields?: Record<string, CustomFieldValue>;
}): EditWorkitemJson {
  const body: EditWorkitemJson = { issues: [options.key] };
  if (options.summary) body.summary = options.summary;
  if (options.description) {
    body.description = descriptionToAdf(options.description);
  }
  if (options.labels?.length) body.labelsToAdd = options.labels;
  if (options.customFields) {
    for (const [fieldId, value] of Object.entries(options.customFields)) {
      body[fieldId] = formatCustomFieldValue(fieldId, value);
    }
  }
  return body;
}

function descriptionToAdf(description: string): AdfDoc {
  return parseAdfDoc(description) ?? markdownToAdf(description);
}

function isOptionSelectField(fieldId: string): boolean {
  return (
    fieldId !== JIRA_SPRINT_FIELD && fieldId !== JIRA_STORY_POINTS_FIELD
  );
}

/** Format a custom field for acli create/edit JSON. */
export function formatCustomFieldValue(
  fieldId: string,
  value: CustomFieldValue
): unknown {
  if (fieldId === JIRA_SPRINT_FIELD || fieldId === JIRA_STORY_POINTS_FIELD) {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    }
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      typeof entry === "object" && entry !== null && "id" in entry
        ? entry
        : { id: String(entry) }
    );
  }
  if (typeof value === "object" && value !== null && "id" in value) {
    return [value];
  }
  if (
    isOptionSelectField(fieldId) &&
    typeof value === "string" &&
    /^\d+$/.test(value)
  ) {
    return [{ id: value }];
  }
  return value;
}

/** Feature Team option id for create JSON. */
export function featureTeamField(optionId: string): Record<string, CustomFieldValue> {
  return { [NOVACORE_FEATURE_TEAM_FIELD]: [{ id: optionId }] };
}

/** Capitalizable Yes for NOVACORE Epic creates. */
export function capitalizableYesField(): Record<string, CustomFieldValue> {
  return {
    [NOVACORE_CAPITALIZABLE_FIELD]: [{ id: NOVACORE_CAPITALIZABLE_YES_ID }]
  };
}

/**
 * Pick the current board sprint id: active state, else date window, else first.
 */
export function pickCurrentSprintId(
  sprints: BoardSprint[],
  nowMs = Date.now()
): number | undefined {
  if (sprints.length === 0) return undefined;
  const active = sprints.find(
    (s) => (s.state ?? "").trim().toLowerCase() === "active"
  );
  if (active) return active.id;

  for (const sprint of sprints) {
    if (!sprint.startDate || !sprint.endDate) continue;
    const start = Date.parse(sprint.startDate);
    const end = Date.parse(sprint.endDate);
    if (
      Number.isFinite(start) &&
      Number.isFinite(end) &&
      nowMs >= start &&
      nowMs <= end
    ) {
      return sprint.id;
    }
  }

  return sprints[0]?.id;
}

/**
 * Fill Feature Team (always when known), optional sprint / story points,
 * and NOVACORE Epic Capitalizable. Explicit `--field` values win.
 */
export function applyCreateFieldDefaults(
  customFields: Record<string, CustomFieldValue>,
  options: {
    source: CreateFieldDefaultsSource;
    project: string;
    issueType: string;
    boardDefaults?: boolean;
    sprintId?: number;
    storyPoints?: number;
  }
): Record<string, CustomFieldValue> {
  const out = { ...customFields };
  const {
    source,
    project,
    issueType,
    boardDefaults = false,
    sprintId,
    storyPoints
  } = options;

  const teamField =
    source.featureTeamField.trim() || NOVACORE_FEATURE_TEAM_FIELD;
  const teamOptionId = source.featureTeamOptionId.trim();
  if (teamOptionId && out[teamField] === undefined) {
    out[teamField] = [{ id: teamOptionId }];
  }

  const resolvedSprintId =
    sprintId ??
    (boardDefaults ? pickCurrentSprintId(source.sprints) : undefined);
  const sprintField = source.sprintField.trim() || JIRA_SPRINT_FIELD;
  if (resolvedSprintId !== undefined && out[sprintField] === undefined) {
    out[sprintField] = resolvedSprintId;
  }

  const pointsField = source.storyPointsField.trim() || JIRA_STORY_POINTS_FIELD;
  if (storyPoints !== undefined && out[pointsField] === undefined) {
    out[pointsField] = storyPoints;
  }

  if (
    issueType.trim().toLowerCase() === "epic" &&
    project.trim().toUpperCase() === "NOVACORE" &&
    out[NOVACORE_CAPITALIZABLE_FIELD] === undefined
  ) {
    Object.assign(out, capitalizableYesField());
  }

  return out;
}

/** Collect repeated `--field id=value` args from argv. */
export function collectFieldFlags(argv: string[]): string[] {
  const fields: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--field" && argv[i + 1]) {
      fields.push(argv[i + 1]!);
      i += 1;
    }
  }
  return fields;
}

/** Parse `--field customfield_10354=16409` style flags. */
export function parseFieldFlags(
  fields: string[]
): Record<string, CustomFieldValue> {
  const out: Record<string, CustomFieldValue> = {};
  for (const entry of fields) {
    const eq = entry.indexOf("=");
    if (eq <= 0) continue;
    const id = entry.slice(0, eq).trim();
    const raw = entry.slice(eq + 1).trim();
    if (!id || !raw) continue;
    if (id === JIRA_SPRINT_FIELD || id === JIRA_STORY_POINTS_FIELD) {
      const n = Number(raw);
      out[id] = Number.isFinite(n) ? n : raw;
      continue;
    }
    if (/^\d+$/.test(raw)) {
      out[id] = [{ id: raw }];
    } else {
      out[id] = raw;
    }
  }
  return out;
}

/** Write create or edit JSON to a temp file; caller must delete the directory. */
export function writeCreateJsonTemp(
  json: CreateWorkitemJson | EditWorkitemJson,
  prefix = "jira-create-"
): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dir, "workitem.json");
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf-8");
  return { dir, filePath };
}
