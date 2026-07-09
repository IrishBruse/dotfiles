#!/usr/bin/env node
// postToolUse hook: warn the agent about global.mdc and skills.mdc style issues after writes.

const { readFile } = require("node:fs/promises");
const { join } = require("node:path");

const { lint: lintProseSemicolons } = require("./style-lint/prose-semicolons");
const { lint: lintLongLines } = require("./style-lint/long-lines");
const { lint: lintNonAscii } = require("./style-lint/non-ascii");
const { lint: lintDescriptionBlock } = require("./style-lint/description-block");
const { lint: lintHomeRepoPaths } = require("./style-lint/home-repo-paths");

const SKILL_PATH =
  /(?:^|\/)(?:\.agents\/skills\/.+\/SKILL\.md|\.cursor\/skills\/.+\/SKILL\.md)$/i;

const MARKDOWN_LINTS = [lintProseSemicolons, lintLongLines];
const SKILL_LINTS = [lintDescriptionBlock, lintHomeRepoPaths, lintNonAscii];

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

function isSkillFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return SKILL_PATH.test(normalized) && normalized.endsWith("SKILL.md");
}

function runLints(content, lints) {
  return lints.flatMap((lint) => lint(content));
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
    const lints = skill ? [...MARKDOWN_LINTS, ...SKILL_LINTS] : MARKDOWN_LINTS;
    const warnings = runLints(content, lints);

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
