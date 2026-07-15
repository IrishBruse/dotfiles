/**
 * NOVACORE custom field helpers for `acli jira workitem create --from-json`.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** NOVACORE Feature Team field id. */
export const NOVACORE_FEATURE_TEAM_FIELD = "customfield_10354";

/** NOVACORE Capitalizable field id (Epic creates). */
export const NOVACORE_CAPITALIZABLE_FIELD = "customfield_10998";

/** Default Capitalizable option id (Yes) on NOVACORE. */
export const NOVACORE_CAPITALIZABLE_YES_ID = "15465";

export type CustomFieldValue =
  | string
  | number
  | boolean
  | { id: string }
  | Array<{ id: string }>;

export type CreateWorkitemJson = {
  fields: Record<string, unknown>;
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
    fields.description = options.description;
  }
  if (options.parent) {
    fields.parent = { key: options.parent };
  }
  if (options.labels?.length) {
    fields.labels = options.labels;
  }
  if (options.customFields) {
    for (const [fieldId, value] of Object.entries(options.customFields)) {
      fields[fieldId] = formatCustomFieldValue(value);
    }
  }
  return { fields };
}

function formatCustomFieldValue(value: CustomFieldValue): unknown {
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
  if (typeof value === "string" && /^\d+$/.test(value)) {
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
    if (/^\d+$/.test(raw)) {
      out[id] = [{ id: raw }];
    } else {
      out[id] = raw;
    }
  }
  return out;
}

/** Write create JSON to a temp file; caller must delete the directory. */
export function writeCreateJsonTemp(
  json: CreateWorkitemJson,
  prefix = "jira-create-"
): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const filePath = path.join(dir, "workitem.json");
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf-8");
  return { dir, filePath };
}
