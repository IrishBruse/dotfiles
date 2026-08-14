/**
 * `jira batch` -- run multiple read-only commands in one invocation.
 */
import fs from "node:fs";
import process from "node:process";

import { createConcurrencyLimiter } from "../../../.lib/concurrency.ts";
import {
  listProjectIssueTypesAsync,
  listProjectsAsync,
  searchWorkitemsAsync
} from "../../lib/acli-jira.ts";
import { flagBool, flagString, parseSubcommandArgv } from "../../lib/argv.ts";
import { configuredProject } from "../../lib/CONFIG.ts";
import {
  JIRA_SEARCH_DEFAULT_LIMIT,
  JIRA_SEARCH_LIST_FIELDS
} from "../../lib/format.ts";
import { gatherBoardCache } from "./board.ts";
import { gatherJiraInfoJson } from "../../lib/info.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";
import { resolveShowAsync } from "../read/show.ts";
import { buildSearchResult, normalizeSearchJql } from "../read/search.ts";

const ALLOWED_BATCH_COMMANDS = new Set([
  "show",
  "search",
  "projects",
  "types",
  "info",
  "board"
]);

/** Match sync/pull/push: overlap acli calls without flooding the API. */
const BATCH_CONCURRENCY = 4;

export type BatchItemResult = {
  index: number;
  success: boolean;
  data: unknown | null;
  error: string | null;
};

type BatchItemOutcome = {
  success: boolean;
  data: unknown | null;
  error: string | null;
};

/** Read batch commands from `--file`, a positional JSON array or path, or stdin. */
export function readBatchInput(argv: string[]): string | null {
  const parsed = parseSubcommandArgv(argv, 3);
  const file = flagString(parsed.flags, "file");
  if (file) {
    return fs.readFileSync(file, "utf-8");
  }
  const positional = parsed.positional[0]?.trim();
  if (positional) {
    return positional.startsWith("[")
      ? positional
      : fs.readFileSync(positional, "utf-8");
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

/** Stable key for coalescing identical show/search work in one batch. */
export function coalesceKey(itemArgv: string[]): string | null {
  const cmd = itemArgv[0];
  if (cmd === "show" || cmd === "search") {
    return itemArgv.join("\0");
  }
  return null;
}

export async function executeBatchItem(
  itemArgv: string[]
): Promise<BatchItemOutcome> {
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
      case "info": {
        const fullArgv = ["node", "jira", ...itemArgv];
        const includeBoard = flagBool(
          parseSubcommandArgv(fullArgv, 3).flags,
          "board"
        );
        return {
          success: true,
          data: gatherJiraInfoJson(undefined, { includeBoard }),
          error: null
        };
      }
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
        return { success: true, data: await listProjectsAsync(), error: null };
      case "types": {
        const project = configuredProject();
        if (!project) {
          return {
            success: false,
            data: null,
            error: "types: set project in ~/.config/jira/config.json"
          };
        }
        return {
          success: true,
          data: await listProjectIssueTypesAsync(project),
          error: null
        };
      }
      case "show":
        return {
          success: true,
          data: await resolveShowAsync(["node", "jira", ...itemArgv]),
          error: null
        };
      case "search": {
        const fullArgv = ["node", "jira", ...itemArgv];
        const parsed = parseSubcommandArgv(fullArgv, 3);
        const raw = parsed.positional[0]?.trim() ?? "";
        if (!raw) {
          return { success: false, data: null, error: "search: missing JQL query" };
        }
        const { jql } = normalizeSearchJql(raw);
        const fields = flagString(parsed.flags, "fields", JIRA_SEARCH_LIST_FIELDS);
        const rawOutput = flagBool(parsed.flags, "raw");
        const paginate = flagBool(parsed.flags, "paginate");
        const limitRaw = flagString(parsed.flags, "limit");
        let limit: number | null = paginate ? null : JIRA_SEARCH_DEFAULT_LIMIT;
        if (limitRaw) {
          const n = Number.parseInt(limitRaw, 10);
          if (!Number.isFinite(n) || n <= 0) {
            return {
              success: false,
              data: null,
              error: "search: --limit must be a positive integer"
            };
          }
          limit = n;
        }
        const data = await searchWorkitemsAsync({
          jql,
          fields,
          paginate,
          limit: limit ?? undefined
        });
        return {
          success: true,
          data: rawOutput ? data : buildSearchResult({ jql, data, limit }),
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

/** Coalesce identical show/search argv while a call is in flight. */
export function createBatchRunner(
  execute: (itemArgv: string[]) => Promise<BatchItemOutcome> = executeBatchItem
): (itemArgv: string[]) => Promise<BatchItemOutcome> {
  const inflight = new Map<string, Promise<BatchItemOutcome>>();
  return (itemArgv: string[]) => {
    const key = coalesceKey(itemArgv);
    if (!key) {
      return execute(itemArgv);
    }
    const existing = inflight.get(key);
    if (existing) return existing;
    const promise = execute(itemArgv).finally(() => {
      inflight.delete(key);
    });
    inflight.set(key, promise);
    return promise;
  };
}

async function runBatchSequential(
  commands: string[][],
  stopOnError: boolean,
  runItem: (itemArgv: string[]) => Promise<BatchItemOutcome>
): Promise<{ results: BatchItemResult[]; exitCode: number }> {
  const results: BatchItemResult[] = [];
  let exitCode = 0;
  for (let index = 0; index < commands.length; index++) {
    const item = await runItem(commands[index]!);
    results.push({ index, ...item });
    if (!item.success) {
      exitCode = 1;
      if (stopOnError) break;
    }
  }
  return { results, exitCode };
}

async function runBatchParallel(
  commands: string[][],
  runItem: (itemArgv: string[]) => Promise<BatchItemOutcome>
): Promise<{ results: BatchItemResult[]; exitCode: number }> {
  const limit = createConcurrencyLimiter(BATCH_CONCURRENCY);
  const results = await Promise.all(
    commands.map((itemArgv, index) =>
      limit(async (): Promise<BatchItemResult> => {
        const item = await runItem(itemArgv);
        return { index, ...item };
      })
    )
  );
  const exitCode = results.some((r) => !r.success) ? 1 : 0;
  return { results, exitCode };
}

async function collectBatchResults(
  argv: string[],
  stopOnError: boolean
): Promise<{ results: BatchItemResult[]; exitCode: number }> {
  const raw = readBatchInput(argv);
  if (!raw?.trim()) {
    throw new Error(
      "pass a JSON array as an argument, on stdin, or with --file"
    );
  }
  const commands = parseBatchCommands(raw);
  const runItem = createBatchRunner();
  return stopOnError
    ? runBatchSequential(commands, true, runItem)
    : runBatchParallel(commands, runItem);
}

/** Run `jira batch [--file path] [--stop-on-error]`. */
export async function runBatchCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): Promise<number> {
  const parsed = parseSubcommandArgv(argv, 3);
  const stopOnError = flagBool(parsed.flags, "stop-on-error");

  try {
    const { results, exitCode } = await collectBatchResults(argv, stopOnError);

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

/** Test helper: run batch and return indexed results without printing. */
export async function runBatchForTest(
  argv: string[]
): Promise<{ results: BatchItemResult[]; exitCode: number }> {
  const parsed = parseSubcommandArgv(argv, 3);
  const stopOnError = flagBool(parsed.flags, "stop-on-error");
  return collectBatchResults(argv, stopOnError);
}
