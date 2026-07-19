export type FrontmatterScalar = string | boolean;

export interface FrontmatterEntry {
  key: string;
  value: FrontmatterScalar;
}

export interface ParsedFrontmatter {
  entries: FrontmatterEntry[];
}

function unquoteString(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
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

/** Parse skill YAML frontmatter (scalars, quotes, and simple block strings). */
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

    entries.push({ key, value: parseScalar(rest) });
    index++;
  }

  return { entries };
}

function scalarToDisplay(value: FrontmatterScalar): string {
  return typeof value === "boolean" ? (value ? "true" : "false") : value;
}

export interface DisplayField {
  key: string;
  value: string;
}

/** Turn parsed frontmatter into display fields for `skills ls`. */
export function frontmatterDisplayFields(
  parsed: ParsedFrontmatter,
  skillName: string
): DisplayField[] {
  const byKey = new Map(parsed.entries.map((entry) => [entry.key, entry.value]));
  const fields: DisplayField[] = [];

  const name = byKey.get("name");
  if (typeof name === "string" && name !== skillName) {
    fields.push({ key: "name", value: name });
  }

  const description = byKey.get("description");
  if (typeof description === "string" && description.length > 0) {
    fields.push({ key: "description", value: description });
  }

  const disableModelInvocation = byKey.get("disable-model-invocation");
  if (disableModelInvocation === true) {
    fields.push({ key: "invocation", value: "user" });
  } else if (disableModelInvocation === false) {
    fields.push({ key: "invocation", value: "model" });
  }

  for (const entry of parsed.entries) {
    if (
      entry.key === "name" ||
      entry.key === "description" ||
      entry.key === "disable-model-invocation"
    ) {
      continue;
    }
    fields.push({ key: entry.key, value: scalarToDisplay(entry.value) });
  }

  return fields;
}
