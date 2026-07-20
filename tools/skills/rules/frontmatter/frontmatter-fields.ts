import { parseSkillFrontmatter } from "../../frontmatter.ts";
import { extractFrontmatter, isSkillMd } from "../core/shared.ts";
import type { Diagnostic } from "../core/types.ts";

export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_NAME_WORDS = ["anthropic", "claude"];
const VAGUE_SKILL_NAMES = new Set([
  "helper",
  "utils",
  "tools",
  "documents",
  "data",
  "files",
]);
const XML_TAG = /<[^>]+>/;
const DESCRIPTION_SECOND_PERSON =
  /\b(I can help|I will help|You can use this|You can use)\b/i;

interface DescriptionField {
  line: number;
  value: string;
  format: "scalar" | "block" | "invalid";
}

function frontmatterLineToFileLine(frontmatterLine: number): number {
  return frontmatterLine + 1;
}

function readQuotedDescription(
  lines: string[],
  start: number,
  quote: "'" | '"'
): { value: string; next: number } | undefined {
  const first = lines[start] ?? "";
  const afterKey = first.replace(/^description:\s*/, "");
  if (!afterKey.startsWith(quote)) return undefined;

  let text = "";
  let chunk = afterKey.slice(1);
  let index = start;

  while (true) {
    const close = chunk.indexOf(quote);
    if (close !== -1) {
      text += chunk.slice(0, close);
      return { value: text, next: index };
    }
    text += `${chunk}\n`;
    index += 1;
    if (index >= lines.length) return undefined;
    chunk = lines[index] ?? "";
  }
}

function extractDescriptionField(frontmatter: string): DescriptionField | undefined {
  const lines = frontmatter.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const match = /^description:\s*(.*)$/.exec(line);
    if (!match) continue;

    const rest = (match[1] ?? "").trim();
    const lineNumber = i + 1;

    if (rest === "") {
      const next = lines[i + 1] ?? "";
      if (/^\s+/.test(next)) {
        return { line: lineNumber, value: "", format: "invalid" };
      }
      return { line: lineNumber, value: "", format: "scalar" };
    }

    if (/^[>|]/.test(rest)) {
      return { line: lineNumber, value: "", format: "block" };
    }

    if (rest.startsWith("'") || rest.startsWith('"')) {
      const quote = (rest.startsWith("'") ? "'" : '"') as "'" | '"';
      const quoted = readQuotedDescription(lines, i, quote);
      if (quoted) {
        return { line: lineNumber, value: quoted.value.trim(), format: "scalar" };
      }
      return { line: lineNumber, value: rest, format: "invalid" };
    }

    return { line: lineNumber, value: rest, format: "scalar" };
  }

  return undefined;
}

function pushDiagnostic(
  diagnostics: Diagnostic[],
  frontmatterLine: number,
  column: number,
  code: string,
  message: string,
  severity: Diagnostic["severity"] = "warning"
): void {
  diagnostics.push({
    line: frontmatterLineToFileLine(frontmatterLine),
    column,
    code,
    message,
    severity,
  });
}

function lintOrphanFrontmatterLines(frontmatter: string): Diagnostic[] {
  const lines = frontmatter.split("\n");
  const diagnostics: Diagnostic[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const lineNumber = index + 1;
    if (line.trim() === "") {
      index++;
      continue;
    }

    const match = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(line);
    if (!match) {
      pushDiagnostic(
        diagnostics,
        lineNumber,
        1,
        "frontmatter-orphan",
        "Frontmatter lines must be key/value pairs. Use a quoted or folded YAML string for multi-line descriptions.",
        "error"
      );
      index++;
      continue;
    }

    const rest = (match[2] ?? "").trim();
    if (rest === "" || /^[>|]/.test(rest)) {
      index++;
      while (index < lines.length) {
        const next = lines[index] ?? "";
        if (next.trim() === "" || /^\s/.test(next)) {
          index++;
          continue;
        }
        break;
      }
      continue;
    }

    const quote = rest.startsWith("'")
      ? "'"
      : rest.startsWith('"')
        ? '"'
        : undefined;
    if (quote !== undefined && !rest.endsWith(quote)) {
      index++;
      while (index < lines.length) {
        const next = lines[index] ?? "";
        index++;
        if (next.includes(quote)) break;
      }
      continue;
    }

    index++;
  }

  return diagnostics;
}

export function lint(content: string, filePath?: string): Diagnostic[] {
  if (!isSkillMd(filePath)) return [];

  const frontmatter = extractFrontmatter(content);
  if (!frontmatter) return [];

  const diagnostics: Diagnostic[] = [
    ...lintOrphanFrontmatterLines(frontmatter),
  ];
  const parsed = parseSkillFrontmatter(frontmatter);
  const byKey = new Map(parsed.entries.map((entry) => [entry.key, entry.value]));

  const nameEntry = parsed.entries.find((entry) => entry.key === "name");
  if (nameEntry === undefined) {
    pushDiagnostic(
      diagnostics,
      1,
      1,
      "frontmatter-name",
      "SKILL.md frontmatter must include a `name` field.",
      "error"
    );
  } else {
    const nameLine =
      frontmatter
        .split("\n")
        .findIndex((line) => /^name:\s*/.test(line)) + 1;
    const name =
      typeof nameEntry.value === "string" ? nameEntry.value.trim() : "";

    if (name.length === 0) {
      pushDiagnostic(
        diagnostics,
        nameLine,
        7,
        "frontmatter-name",
        "Frontmatter `name` must be a non-empty string.",
        "error"
      );
    } else {
      if (name.length > MAX_NAME_LENGTH) {
        pushDiagnostic(
          diagnostics,
          nameLine,
          7,
          "frontmatter-name",
          `Frontmatter \`name\` exceeds ${MAX_NAME_LENGTH} characters (${name.length}).`,
          "error"
        );
      }
      if (!NAME_PATTERN.test(name)) {
        pushDiagnostic(
          diagnostics,
          nameLine,
          7,
          "frontmatter-name",
          "Frontmatter `name` must use lowercase letters, numbers, and hyphens only.",
          "error"
        );
      }
      if (XML_TAG.test(name)) {
        pushDiagnostic(
          diagnostics,
          nameLine,
          7,
          "frontmatter-name",
          "Frontmatter `name` must not contain XML tags.",
          "error"
        );
      }
      const lowerName = name.toLowerCase();
      for (const reserved of RESERVED_NAME_WORDS) {
        if (lowerName.includes(reserved)) {
          pushDiagnostic(
            diagnostics,
            nameLine,
            7,
            "frontmatter-name",
            `Frontmatter \`name\` must not contain reserved word "${reserved}".`,
            "error"
          );
          break;
        }
      }
      if (VAGUE_SKILL_NAMES.has(name)) {
        pushDiagnostic(
          diagnostics,
          nameLine,
          7,
          "vague-skill-name",
          `Skill name "${name}" is too generic. Use a specific gerund or noun phrase instead.`
        );
      }
    }
  }

  const descriptionField = extractDescriptionField(frontmatter);
  if (descriptionField === undefined) {
    pushDiagnostic(
      diagnostics,
      1,
      1,
      "frontmatter-description",
      "SKILL.md frontmatter must include a `description` field.",
      "error"
    );
    return diagnostics;
  }

  if (descriptionField.format === "block") {
    return diagnostics;
  }

  if (descriptionField.format === "invalid") {
    pushDiagnostic(
      diagnostics,
      descriptionField.line,
      14,
      "frontmatter-description",
      "Frontmatter `description` must be a plain YAML string, not indented continuation lines.",
      "error"
    );
    return diagnostics;
  }

  const description = descriptionField.value;
  if (description.length === 0) {
    pushDiagnostic(
      diagnostics,
      descriptionField.line,
      14,
      "frontmatter-description",
      "Frontmatter `description` must be non-empty.",
      "error"
    );
    return diagnostics;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    pushDiagnostic(
      diagnostics,
      descriptionField.line,
      14,
      "frontmatter-description",
      `Frontmatter \`description\` exceeds ${MAX_DESCRIPTION_LENGTH} characters (${description.length}).`,
      "error"
    );
  }

  if (XML_TAG.test(description)) {
    pushDiagnostic(
      diagnostics,
      descriptionField.line,
      14,
      "frontmatter-description",
      "Frontmatter `description` must not contain XML tags.",
      "error"
    );
  }

  if (DESCRIPTION_SECOND_PERSON.test(description)) {
    pushDiagnostic(
      diagnostics,
      descriptionField.line,
      14,
      "description-voice",
      "Write the description in third person (for example, \"Processes Excel files\"), not \"I can help\" or \"You can use this\"."
    );
  }

  const disableModelInvocation = byKey.get("disable-model-invocation");
  if (disableModelInvocation !== true && !/\buse (when|for)\b/i.test(description)) {
    pushDiagnostic(
      diagnostics,
      descriptionField.line,
      14,
      "description-triggers",
      "Model-invoked descriptions should include when to use the skill (for example, \"Use when...\")."
    );
  }

  return diagnostics;
}
