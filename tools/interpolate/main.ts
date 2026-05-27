/// <reference types="node" />
import process from "node:process";

import { builtinKeys } from "./builtins/index.ts";
import { loadBuiltinsDoc } from "./builtinsDoc.ts";
import { expandTemplate } from "./expand.ts";
import { printInterpolationErrors } from "./errors.ts";
import {
  DEFAULT_PROMPTS_DIR,
  listPromptNames,
  loadPromptTemplate,
  promptPath,
  resolvePromptsDir
} from "./promptsDir.ts";

const PROMPTS_DIR_FLAG = "--prompts-dir";
const BUILTINS_DOC = "docs/builtins.md";

function printUsage(promptsDir: string, names: string[]): void {
  console.error(`interpolate — expand markdown prompt templates

Usage:
  interpolate <name>
  interpolate builtins

Options:
  --prompts-dir <path>   Prompt library (default: ${DEFAULT_PROMPTS_DIR})
  -h, --help             This help

Built-ins:
  interpolate builtins   Print ${BUILTINS_DOC} with placeholders expanded

Simple placeholders: ${builtinKeys.map((k) => `{{${k}}}`).join(", ")}
Environment: {{env:NAME}}
Line conditions: ?varname: rest of line  (?env:NAME: ..., ?work: -> WORK) — omitted when false
Commands: \`\`\`!<cmd> or \`\`\`lang !<cmd> ... \`\`\` (space before ! when lang is set)
Inline: \`!<shell command>\` (stdout max 40 characters)

Prompts directory: ${promptsDir}
`);

  if (names.length > 0) {
    console.error("Available prompts:");
    for (const n of names) {
      console.error(`  ${n}`);
    }
  }
}

function takeFlag(
  args: string[],
  flag: string
): { rest: string[]; value?: string } {
  const i = args.indexOf(flag);
  if (i === -1) {
    return { rest: args };
  }
  const value = args[i + 1];
  if (value === undefined || value.startsWith("-")) {
    throw new Error(`${flag} requires a path argument`);
  }
  const rest = [...args.slice(0, i), ...args.slice(i + 2)];
  return { rest, value };
}

function runBuiltins(args: string[]): void {
  if (args.length > 0) {
    throw new Error(
      `interpolate builtins: unexpected arguments: ${args.join(" ")}`
    );
  }

  const template = loadBuiltinsDoc();
  const result = expandTemplate(template);
  if (result.ok === false) {
    printInterpolationErrors(BUILTINS_DOC, result.errors);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(result.text);
}

export function main(argv: string[]): void {
  try {
    runMain(argv);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

function runMain(argv: string[]): void {
  let args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    const dir = resolvePromptsDir(undefined);
    printUsage(dir, listPromptNames(dir));
    return;
  }

  if (args[0] === "builtins") {
    runBuiltins(args.slice(1));
    return;
  }

  const { rest: a0, value: promptsDirFlag } = takeFlag(args, PROMPTS_DIR_FLAG);
  args = a0;
  const promptsDir = resolvePromptsDir(promptsDirFlag);

  const name = args[0];
  if (name === undefined || name.startsWith("-")) {
    printUsage(promptsDir, listPromptNames(promptsDir));
    return;
  }

  if (args.length > 1) {
    throw new Error(`unexpected arguments: ${args.slice(1).join(" ")}`);
  }

  const file = promptPath(promptsDir, name);
  const template = loadPromptTemplate(promptsDir, name);
  const result = expandTemplate(template);
  if (result.ok === false) {
    printInterpolationErrors(file, result.errors);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(result.text);
}

main(process.argv);
