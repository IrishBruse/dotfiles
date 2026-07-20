#!/usr/bin/env node
// postToolUse hook: warn about prose style issues after markdown writes.

const { lint: lintProseSemicolons } = require("./style-lint/prose-semicolons");
const { lint: lintLongLines } = require("./style-lint/long-lines");
const {
  noop,
  warnAgent,
  readHookInput,
  markdownWritePath,
  readWrittenContent,
} = require("./style-lint/io");

function runLints(content) {
  const warnings = [];
  warnings.push(...lintProseSemicolons(content));
  warnings.push(...lintLongLines(content));
  return warnings;
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

    const warnings = runLints(content);
    if (warnings.length > 0) {
      warnAgent(filePath, warnings, "global.mdc");
      return;
    }

    noop();
  } catch (err) {
    console.error("[style-lint] hook error:", err);
    noop();
  }
}

main();
