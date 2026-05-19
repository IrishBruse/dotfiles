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
  resolvePromptsDir,
} from "./promptsDir.ts";

const PROMPTS_DIR_FLAG = "--prompts-dir";
const BUILTINS_DOC = "docs/builtins.md";

function printUsage(promptsDir: string, names: string[]): void {
  console.error(`interpolate — expand markdown prompt templates

Usage:
  interpolate <name> [--var key=value ...]
  interpolate builtins [--var key=value ...]

Options:
  --prompts-dir <path>   Prompt library (default: ${DEFAULT_PROMPTS_DIR})
  --var <key=value>      Template variable (repeatable)
  -h, --help             This help

Built-ins:
  interpolate builtins   Print ${BUILTINS_DOC} with placeholders expanded

Simple placeholders: ${builtinKeys.map((k) => `{{${k}}}`).join(", ")}
Environment: {{env:NAME}}
Line conditions: ?varname: rest of line  (?env:NAME: ...) — omitted when false
Commands: \`\`\`!<shell command> ... \`\`\` (body replaced with stdout)
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

function parseVarArg(raw: string): [string, string] {
  const eq = raw.indexOf("=");
  if (eq === -1) {
    throw new Error(`--var expects key=value, got: ${raw}`);
  }
  return [raw.slice(0, eq), raw.slice(eq + 1)];
}

function takeFlag(args: string[], flag: string): { rest: string[]; value?: string } {
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

function collectVars(args: string[]): { rest: string[]; vars: Record<string, string> } {
  const vars: Record<string, string> = {};
  const rest: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--var") {
      const raw = args[i + 1];
      if (raw === undefined) {
        throw new Error("--var requires key=value");
      }
      const [key, value] = parseVarArg(raw);
      vars[key] = value;
      i += 1;
      continue;
    }
    rest.push(a);
  }
  return { rest, vars };
}

function runBuiltins(args: string[]): void {
  const { rest, vars } = collectVars(args);
  if (rest.length > 0) {
    throw new Error(`interpolate builtins: unexpected arguments: ${rest.join(" ")}`);
  }

  const template = loadBuiltinsDoc();
  const result = expandTemplate(template, vars);
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

  const { rest: a1, vars } = collectVars(args);
  args = a1;

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
  const result = expandTemplate(template, vars);
  if (result.ok === false) {
    printInterpolationErrors(file, result.errors);
    process.exitCode = 1;
    return;
  }
  process.stdout.write(result.text);
}

main(process.argv);
