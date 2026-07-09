#!/usr/bin/env node
// postToolUse hook: warn the agent about global.mdc and skills.mdc style issues after writes.

const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

const MAX_LINE = 160;

const SKILL_PATH =
  /(?:^|\/)(?:\.agents\/skills\/.+\/SKILL\.md|\.cursor\/skills\/.+\/SKILL\.md)$/i;

const HOME_REPO_PATH = /home\/\.(?:agents|cursor)\//g;

const DESCRIPTION_BLOCK_SCALAR = /^description:\s*[>|][-+]?(?:\s|$)/m;

function noop() {
  process.stdout.write("{}");
}

function warnAgent(path, warnings, source) {
  process.stdout.write(
    JSON.stringify({
      additional_context: [
        `Style lint warning for ${path} (${source}):`,
        ...warnings.map((w) => `- ${w}`),
        "Consider fixing these in a follow-up edit if appropriate.",
      ].join("\n"),
    }),
  );
}

function stripCodeSections(text) {
  let result = text.replace(/```[\s\S]*?```/g, "");
  result = result.replace(/`[^`\n]+`/g, "");
  return result;
}

function findProseSemicolons(text) {
  const prose = stripCodeSections(text);
  const hits = [];
  const re = /[a-zA-Z][\w'']*;\s+[a-z]/g;
  let match;
  while ((match = re.exec(prose)) !== null) {
    const lineStart = prose.lastIndexOf("\n", match.index) + 1;
    const lineEnd = prose.indexOf("\n", match.index);
    const line = prose.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/https?:\/\//.test(line)) continue;
    if (/^\s*(import|export|const|let|var|function|return|class|interface|type|#include|using)\b/.test(line)) {
      continue;
    }
    hits.push(match[0].trim());
    if (hits.length >= 3) break;
  }
  return hits;
}

function findLongLines(content) {
  const lines = content.split("\n");
  const long = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("://")) continue;
    if (/^\s*\|/.test(line)) continue;
    if (/^\s*```/.test(line)) continue;
    if (line.length > MAX_LINE) {
      long.push(i + 1);
      if (long.length >= 3) break;
    }
  }
  return long;
}

function findNonAscii(text) {
  const prose = stripCodeSections(text);
  const hits = [];
  const lines = prose.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch.codePointAt(0) > 127) {
        hits.push({ line: i + 1, ch });
        break;
      }
    }
    if (hits.length >= 3) break;
  }
  return hits;
}

function extractFrontmatter(content) {
  if (!content.startsWith("---")) return "";
  const end = content.indexOf("\n---", 3);
  if (end === -1) return "";
  return content.slice(3, end);
}

function lintMarkdown(content) {
  const warnings = [];

  const semicolons = findProseSemicolons(content);
  if (semicolons.length > 0) {
    warnings.push(
      `Prose semicolon(s) ("${semicolons.join('", "')}"). Prefer "," over ";" in English text.`,
    );
  }

  const long = findLongLines(content);
  if (long.length > 0) {
    warnings.push(
      `Line(s) over ${MAX_LINE} chars: ${long.join(", ")}. Add a newline after "." instead of one long line.`,
    );
  }

  return warnings;
}

function lintSkill(content) {
  const warnings = [];

  const frontmatter = extractFrontmatter(content);
  if (frontmatter && DESCRIPTION_BLOCK_SCALAR.test(frontmatter)) {
    warnings.push(
      'Frontmatter `description` must be a plain YAML string, not a block scalar (`>`, `|`, or variants).',
    );
  }

  const prose = stripCodeSections(content);
  const homePaths = [...prose.matchAll(HOME_REPO_PATH)];
  if (homePaths.length > 0) {
    const samples = [...new Set(homePaths.map((m) => m[0]))].slice(0, 3);
    warnings.push(
      `Repo path(s) in docs (${samples.join(", ")}). Use runtime paths under ~/, not home/.`,
    );
  }

  const nonAscii = findNonAscii(content);
  if (nonAscii.length > 0) {
    const detail = nonAscii
      .map(({ line, ch }) => `line ${line} (${JSON.stringify(ch)})`)
      .join(", ");
    warnings.push(`Non-ASCII character(s): ${detail}. Use plain ASCII (no emoji or Unicode punctuation).`);
  }

  return warnings;
}

function isSkillFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return SKILL_PATH.test(normalized) && normalized.endsWith("SKILL.md");
}

async function readWrittenContent(input, filePath) {
  const cwd = input.cwd ?? process.cwd();
  try {
    return await readFile(join(cwd, filePath), "utf8");
  } catch {
    const ti = input.tool_input ?? {};
    if (input.tool_name === "Write") return ti.content ?? "";
    if (input.tool_name === "StrReplace") return ti.new_string ?? "";
    return "";
  }
}

async function main() {
  let input;
  try {
    const raw = await new Promise((resolve, reject) => {
      const chunks = [];
      process.stdin.on("data", (chunk) => chunks.push(chunk));
      process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      process.stdin.on("error", reject);
    });
    input = JSON.parse(raw);
  } catch {
    noop();
    return;
  }

  const tool = input.tool_name ?? "";
  if (tool !== "Write" && tool !== "StrReplace") {
    noop();
    return;
  }

  const ti = input.tool_input ?? {};
  const filePath = ti.path ?? ti.file_path ?? "";
  const lower = filePath.toLowerCase();
  if (!filePath || !(lower.endsWith(".md") || lower.endsWith(".mdc"))) {
    noop();
    return;
  }

  try {
    const content = await readWrittenContent(input, filePath);
    if (!content) {
      noop();
      return;
    }

    const skill = isSkillFile(filePath);
    const warnings = lintMarkdown(content);
    if (skill) {
      warnings.push(...lintSkill(content));
    }

    if (warnings.length > 0) {
      const source = skill ? "global.mdc, skills.mdc" : "global.mdc";
      warnAgent(filePath, warnings, source);
      return;
    }

    noop();
  } catch (err) {
    console.error("[style-lint] hook error:", err);
    noop();
  }
}

main();
