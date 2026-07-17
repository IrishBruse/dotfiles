/**
 * `jira batch` -- run multiple read-only commands in one invocation.
 */
import fs from "node:fs";
import process from "node:process";

import {
  listProjectIssueTypes,
  listProjects,
  searchWorkitems,
  viewWorkitem
} from "../../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { configuredProject } from "../../lib/CONFIG.ts";
import { jiraPullFields, JIRA_SEARCH_FIELDS } from "../../lib/format.ts";
import { gatherBoardCache } from "./board.ts";
import { gatherJiraInfo } from "../../lib/info.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

const ALLOWED_BATCH_COMMANDS = new Set([
  "show",
  "search",
  "projects",
  "types",
  "info",
  "board"
]);

export type BatchItemResult = {
  index: number;
  success: boolean;
  data: unknown | null;
  error: string | null;
};

function readBatchInput(argv: string[]): string | null {
  const parsed = parseSubcommandArgv(argv, 3);
  const file = flagString(parsed.flags, "file");
  if (file) {
    return fs.readFileSync(file, "utf-8");
  }
  if (!process.stdin.isTTY) {
    return fs.readFileSync(0, "utf-8");
  }
  return null;
}

function parseBatchCommands(raw: string): string[][] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("batch input must be a JSON array");
  }
  return parsed.map((item, index) => {
    if (!Array.isArray(item) || item.some((part) => typeof part !== "string")) {
      throw new Error(`batch item ${index} must be a string array`);
    }
    return item as string[];
  });
}

function runBatchItem(itemArgv: string[]): {
  success: boolean;
  data: unknown | null;
  error: string | null;
} {
  const cmd = itemArgv[0];
  if (!cmd) {
    return { success: false, data: null, error: "batch item missing command" };
  }
  if (!ALLOWED_BATCH_COMMANDS.has(cmd)) {
    return {
      success: false,
      data: null,
      error: `batch: disallowed command: ${cmd}`
    };
  }

  try {
    switch (cmd) {
      case "info":
        return { success: true, data: gatherJiraInfo(), error: null };
      case "board": {
        const cache = gatherBoardCache();
        if (!cache) {
          return {
            success: false,
            data: null,
            error: "board cache not found (run jira sync)"
          };
        }
        return { success: true, data: cache, error: null };
      }
      case "projects":
        return { success: true, data: listProjects(), error: null };
      case "types": {
        const project = configuredProject();
        if (!project) {
          return {
            success: false,
            data: null,
            error: "types: set project in ~/.config/jira/config.json (or use jira acli)"
          };
        }
        return {
          success: true,
          data: listProjectIssueTypes(project),
          error: null
        };
      }
      case "show": {
        const fullArgv = ["node", "jira", ...itemArgv];
        const parsed = parseSubcommandArgv(fullArgv, 3);
        const input = parsed.positional[0];
        if (!input) {
          return { success: false, data: null, error: "show: missing Jira key or URL" };
        }
        const key = parseJiraKey(input);
        if (!key) {
          return {
            success: false,
            data: null,
            error: `show: not a valid Jira key or URL: ${input}`
          };
        }
        const fields =
          typeof parsed.flags.get("fields") === "string"
            ? String(parsed.flags.get("fields"))
            : jiraPullFields();
        return { success: true, data: viewWorkitem(key, { fields }), error: null };
      }
      case "search": {
        const fullArgv = ["node", "jira", ...itemArgv];
        const parsed = parseSubcommandArgv(fullArgv, 3);
        const jql = parsed.positional[0]?.trim() ?? "";
        if (!jql) {
          return { success: false, data: null, error: "search: missing JQL query" };
        }
        const fields = flagString(parsed.flags, "fields", JIRA_SEARCH_FIELDS);
        const paginate = !flagBool(parsed.flags, "no-paginate");
        return {
          success: true,
          data: searchWorkitems({ jql, fields, paginate }),
          error: null
        };
      }
      default:
        return {
          success: false,
          data: null,
          error: `batch: unsupported command: ${cmd}`
        };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, data: null, error: msg };
  }
}

/** Run `jira batch [--file path] [--stop-on-error]`. */
export function runBatchCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  const parsed = parseSubcommandArgv(argv, 3);
  const stopOnError = flagBool(parsed.flags, "stop-on-error");

  try {
    const raw = readBatchInput(argv);
    if (!raw?.trim()) {
      return failCommand(
        "batch: pass JSON array on stdin or use --file",
        options.outputMode
      );
    }
    const commands = parseBatchCommands(raw);
    const results: BatchItemResult[] = [];
    let exitCode = 0;

    for (let index = 0; index < commands.length; index++) {
      const item = runBatchItem(commands[index]!);
      results.push({ index, ...item });
      if (!item.success) {
        exitCode = 1;
        if (stopOnError) break;
      }
    }

    if (isJsonMode(options)) {
      printJsonSuccess(results);
      return exitCode;
    }

    for (const result of results) {
      const mark = result.success ? "ok" : "FAIL";
      process.stdout.write(
        `[${mark}] #${result.index} ${result.success ? "success" : result.error}\n`
      );
    }
    return exitCode;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`batch: ${msg}`, options.outputMode);
  }
}
