#!/usr/bin/env node
// postToolUse hook: warn the agent about global.mdc style issues after *.md/*.mdc writes.

const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

const MAX_LINE = 160;

function noop() {
  process.stdout.write("{}");
}

function warnAgent(path, warnings) {
  process.stdout.write(
    JSON.stringify({
      additional_context: [
        `Style lint warning for ${path} (global.mdc):`,
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

function lintMarkdown(content) {
  const warnings = [];

  const semicolons = findProseSemicolons(content);
  if (semicolons.length > 0) {
    warnings.push(
      `Prose semicolon(s) ("${semicolons.join('", "')}"). Prefer "," over ";" in English text.`,
    );
  }

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
  if (long.length > 0) {
    warnings.push(
      `Line(s) over ${MAX_LINE} chars: ${long.join(", ")}. Add a newline after "." instead of one long line.`,
    );
  }

  return warnings;
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

    const warnings = lintMarkdown(content);
    if (warnings.length > 0) {
      warnAgent(filePath, warnings);
      return;
    }

    noop();
  } catch (err) {
    console.error("[style-lint] hook error:", err);
    noop();
  }
}

main();
