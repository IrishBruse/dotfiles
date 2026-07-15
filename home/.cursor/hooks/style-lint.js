#!/usr/bin/env node
// postToolUse hook: warn the agent about global.mdc and writing-great-skills style issues after writes.

const { lint: lintProseSemicolons } = require("./style-lint/prose-semicolons");
const { lint: lintLongLines } = require("./style-lint/long-lines");
const { lint: lintDescriptionBlock } = require("./style-lint/description-block");
const { lint: lintHomeRepoPaths } = require("./style-lint/home-repo-paths");
const { lint: lintNonAscii } = require("./style-lint/non-ascii");
const {
  noop,
  warnAgent,
  readHookInput,
  markdownWritePath,
  readWrittenContent,
} = require("./style-lint/io");

const AGENTS_OR_CURSOR_PATH = /(?:^|\/)\.(?:cursor|agents)\//;

function isSkillFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return AGENTS_OR_CURSOR_PATH.test(normalized);
}

function runLints(content, filePath) {
  const skill = isSkillFile(filePath);
  const warnings = [];

  // global.mdc: all markdown
  warnings.push(...lintProseSemicolons(content));
  warnings.push(...lintLongLines(content));

  // writing-great-skills: SKILL.md only
  if (skill) {
    warnings.push(...lintDescriptionBlock(content));
    warnings.push(...lintHomeRepoPaths(content));
    warnings.push(...lintNonAscii(content));
  }

  return { warnings, skill };
}

async function main() {
  let input;
  try {
    input = await readHookInput();
  } catch {
    noop();
    return;
  }

  const filePath = markdownWritePath(input);
  if (!filePath) {
    noop();
    return;
  }

  try {
    const content = await readWrittenContent(input, filePath);
    if (!content) {
      noop();
      return;
    }

    const { warnings, skill } = runLints(content, filePath);
    if (warnings.length > 0) {
      const source = skill ? "global.mdc, writing-great-skills" : "global.mdc";
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
