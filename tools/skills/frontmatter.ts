export type FrontmatterScalar = string | boolean;

export interface FrontmatterEntry {
  key: string;
  value: FrontmatterScalar | FrontmatterObject;
}

export interface FrontmatterObject {
  [key: string]: FrontmatterScalar | string[];
}

export interface ParsedFrontmatter {
  entries: FrontmatterEntry[];
}

export interface SkillHeadingTag {
  key: string;
  value: string;
  valueRole?: "label" | "warn" | "dim" | "bad";
  /** Paint the key with valueRole and omit the value. */
  keyOnly?: boolean;
}

export interface SkillDisplay {
  description?: string;
  headingTags: SkillHeadingTag[];
  fields: SkillDisplayField[];
}

export interface SkillDisplayField {
  key: string;
  value: string;
  valueRole?: "warn" | "dim";
}

function unquoteString(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replaceAll("''", "'");
  }
  return trimmed;
}

function parseScalar(raw: string): FrontmatterScalar {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  return unquoteString(trimmed);
}

function isBlockScalarIndicator(raw: string): boolean {
  const trimmed = raw.trim();
  return trimmed === ">" || trimmed === ">-" || trimmed === "|" || trimmed === "|-";
}

function lineIndent(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function parseBlockScalar(
  lines: string[],
  start: number,
  indicator: string
): { value: string; next: number } {
  const blockLines: string[] = [];
  let index = start;

  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") {
      blockLines.push("");
      index++;
      continue;
    }
    if (!/^\s/.test(line)) break;
    blockLines.push(line.trimStart());
    index++;
  }

  const folded = indicator.startsWith(">");
  const chomp = indicator.endsWith("-");
  const joined = folded
    ? blockLines.join(chomp ? " " : "\n")
    : blockLines.join("\n");
  const value = folded ? joined.replace(/\s+/g, " ").trim() : joined.trimEnd();

  return { value, next: index };
}

function parseNestedObject(
  lines: string[],
  start: number,
  indent: number
): { value: FrontmatterObject; next: number } {
  const value: FrontmatterObject = {};
  let index = start;

  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") {
      index++;
      continue;
    }

    const currentIndent = lineIndent(line);
    if (currentIndent < indent) break;

    const content = line.slice(indent);
    const match = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(content);
    if (!match) {
      index++;
      continue;
    }

    const key = match[1]!;
    const rest = match[2] ?? "";

    if (rest === "") {
      let peek = index + 1;
      while (peek < lines.length && lines[peek]!.trim() === "") peek++;
      const nextLine = lines[peek];
      const nextIsList =
        nextLine !== undefined &&
        lineIndent(nextLine) >= indent + 2 &&
        /^\s*-\s+/.test(nextLine.slice(indent + 2));

      if (nextIsList) {
        const items: string[] = [];
        index = peek;
        while (index < lines.length) {
          const listLine = lines[index]!;
          if (listLine.trim() === "") {
            index++;
            continue;
          }
          if (lineIndent(listLine) < indent + 2) break;
          const itemMatch = /^-\s+(.*)$/.exec(listLine.slice(indent + 2));
          if (!itemMatch) break;
          items.push(unquoteString(itemMatch[1]!));
          index++;
        }
        value[key] = items;
        continue;
      }

      const child = parseNestedObject(lines, index + 1, indent + 2);
      value[key] = child.value;
      index = child.next;
      continue;
    }

    value[key] = parseScalar(rest);
    index++;
  }

  return { value, next: index };
}

/** Parse skill YAML frontmatter (scalars, quotes, block strings, and shallow nesting). */
export function parseSkillFrontmatter(raw: string): ParsedFrontmatter {
  const lines = raw.split("\n");
  const entries: FrontmatterEntry[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]!;
    if (line.trim() === "") {
      index++;
      continue;
    }

    const match = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (!match) {
      index++;
      continue;
    }

    const key = match[1]!;
    const rest = match[2] ?? "";
    if (isBlockScalarIndicator(rest)) {
      const block = parseBlockScalar(lines, index + 1, rest.trim());
      entries.push({ key, value: block.value });
      index = block.next;
      continue;
    }

    if (rest === "") {
      const nested = parseNestedObject(lines, index + 1, 2);
      entries.push({ key, value: nested.value });
      index = nested.next;
      continue;
    }

    entries.push({ key, value: parseScalar(rest) });
    index++;
  }

  return { entries };
}

function scalarToDisplay(value: FrontmatterScalar): string {
  return typeof value === "boolean" ? (value ? "true" : "false") : value;
}

function isFrontmatterObject(
  value: FrontmatterEntry["value"]
): value is FrontmatterObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatMetadataValue(
  value: FrontmatterScalar | string[] | FrontmatterObject
): string {
  if (Array.isArray(value)) return value.join(", ");
  if (isFrontmatterObject(value)) {
    return Object.entries(value)
      .map(([key, nested]) => `${key}: ${formatMetadataValue(nested)}`)
      .join(", ");
  }
  return scalarToDisplay(value);
}

function metadataFields(
  value: FrontmatterEntry["value"]
): SkillDisplayField[] {
  if (!isFrontmatterObject(value)) return [];

  const fields: SkillDisplayField[] = [];
  for (const [key, fieldValue] of Object.entries(value)) {
    const display = formatMetadataValue(fieldValue);
    if (display.length > 0) {
      fields.push({ key, value: display });
    }
  }
  return fields;
}

function disableModelInvocationTag(
  disableModelInvocation: FrontmatterEntry["value"]
): SkillHeadingTag {
  return {
    key: "disable-model-invocation",
    value: scalarToDisplay(disableModelInvocation as FrontmatterScalar),
    valueRole: disableModelInvocation === true ? "label" : "dim",
    keyOnly: true,
  };
}

function userInvocableTag(
  userInvocable: FrontmatterEntry["value"]
): SkillHeadingTag | undefined {
  if (userInvocable !== false) return undefined;
  return {
    key: "user-invocable",
    value: "false",
    valueRole: "bad",
    keyOnly: true,
  };
}

/** Turn parsed frontmatter into a compact display model for `skills ls`. */
export function skillDisplay(
  parsed: ParsedFrontmatter,
  skillName: string
): SkillDisplay {
  const byKey = new Map(parsed.entries.map((entry) => [entry.key, entry.value]));
  const fields: SkillDisplayField[] = [];

  const name = byKey.get("name");
  if (typeof name === "string" && name.length > 0 && name !== skillName) {
    fields.push({ key: "name", value: name });
  }

  const headingTags: SkillHeadingTag[] = [];

  const disableModelInvocation = byKey.get("disable-model-invocation");
  if (disableModelInvocation !== undefined) {
    headingTags.push(disableModelInvocationTag(disableModelInvocation));
  }

  const userInvocable = byKey.get("user-invocable");
  const userInvocableHeading = userInvocableTag(userInvocable);
  if (userInvocableHeading) {
    headingTags.push(userInvocableHeading);
  }

  const metadata = byKey.get("metadata");
  fields.push(...metadataFields(metadata));

  const description = byKey.get("description");
  const descriptionText =
    typeof description === "string" ? description.trim() : "";

  for (const entry of parsed.entries) {
    if (
      entry.key === "name" ||
      entry.key === "description" ||
      entry.key === "metadata" ||
      entry.key === "disable-model-invocation" ||
      entry.key === "user-invocable"
    ) {
      continue;
    }

    if (typeof entry.value === "string" && entry.value.trim().length > 0) {
      fields.push({ key: entry.key, value: entry.value });
      continue;
    }

    if (typeof entry.value === "boolean") {
      fields.push({ key: entry.key, value: scalarToDisplay(entry.value) });
    }
  }

  return {
    description: descriptionText.length > 0 ? descriptionText : undefined,
    headingTags,
    fields,
  };
}

/** Sort rank for `skills ls`: user-invocable false, then user-invoked, then model-invoked. */
export function skillListSortRank(parsed: ParsedFrontmatter): number {
  const byKey = new Map(parsed.entries.map((entry) => [entry.key, entry.value]));
  if (byKey.get("user-invocable") === false) return 0;
  if (byKey.get("disable-model-invocation") === true) return 1;
  return 2;
}
