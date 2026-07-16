/**
 * `jira pull` -- fetch tickets into `jira/<type>/<title> - <KEY>.md`.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { viewWorkitem, viewWorkitemAsync } from "../../lib/acli-jira.ts";
import { createConcurrencyLimiter } from "../../../.lib/concurrency.ts";
import { CONFIG } from "../../lib/CONFIG.ts";
import {
  fetchDescendantIssues,
  parentKeyFromFields,
  parentSummaryFromFields
} from "../../lib/children.ts";
import {
  formatTicketMarkdown,
  isHierarchyRoot,
  issueTypeName,
  jiraPullFields,
  normalizeSiteHost
} from "../../lib/format.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import type { OutputMode } from "../../lib/output-mode.ts";
import { isJsonMode } from "../../lib/output-mode.ts";
import {
  buildLocalTicketIndex,
  listLocalTickets,
  localTicketPath
} from "../../lib/local.ts";
import type { PullChangeStatus } from "../../lib/types.ts";
import {
  failCommand,
  printChildIssues,
  printError,
  printJsonSuccess,
  printPulled,
  pullLog
} from "../../lib/output.ts";
import { confirm } from "../../lib/prompt.ts";

const PULL_CONCURRENCY = 4;

/** Lowercase slug for `jira/<type>/` paths (e.g. `Epic` -> `epic`). */
export function issueTypeSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Safe markdown filename from the ticket title (e.g. `[DTC] Make foo - PROJ-1.md`). */
export function ticketMarkdownFilename(
  fields: Record<string, unknown>,
  key: string
): string {
  const keySuffix = ` - ${key}`;
  const summary =
    typeof fields.summary === "string" ? fields.summary.trim() : "";
  const title = (summary || key)
    .replace(/[\r\n]+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, Math.max(1, 200 - keySuffix.length))
    .trim();
  if (!title || title === key) {
    return `${key}.md`;
  }
  return `${title}${keySuffix}.md`;
}

/** On-disk path for `jira pull` under a working directory. */
export function pulledTicketPath(
  cwd: string,
  fields: Record<string, unknown>,
  key: string,
  parent?: { key: string; fields: Record<string, unknown> } | null
): string {
  const typeSlug = issueTypeSlug(issueTypeName(fields));
  const filename = ticketMarkdownFilename(fields, key);

  if (typeSlug === "story" && parent?.key) {
    const parentFolder = ticketMarkdownFilename(
      parent.fields,
      parent.key
    ).replace(/\.md$/, "");
    return path.join(cwd, "jira", typeSlug, parentFolder, filename);
  }

  return path.join(cwd, "jira", typeSlug, filename);
}

function resolveStoryParent(
  fields: Record<string, unknown>
): { key: string; fields: Record<string, unknown> } | null {
  if (issueTypeSlug(issueTypeName(fields)) !== "story") return null;

  const parentKey = parentKeyFromFields(fields);
  if (!parentKey) return null;

  const summary = parentSummaryFromFields(fields);
  if (summary) {
    return { key: parentKey, fields: { summary } };
  }

  const data = viewWorkitem(parentKey, { fields: "summary" });
  if (!data || typeof data !== "object") {
    return { key: parentKey, fields: { summary: parentKey } };
  }

  const parentFields =
    (data as { fields?: Record<string, unknown> }).fields ?? {};
  return { key: parentKey, fields: parentFields };
}

export type PullOptions = {
  cwd?: string;
  quiet?: boolean;
  outputMode?: OutputMode;
  /** When true, skip the child-issue prompt and never pull children. */
  noChildren?: boolean;
  /** When true, pull children without prompting. */
  withChildren?: boolean;
  /** Pre-built key -> path index for local lookups. */
  ticketIndex?: Map<string, string>;
};

type PullWriteResult = {
  key: string;
  title: string;
  relPath: string;
  issueType: string;
  status: PullChangeStatus;
};

/** Classify how a pull write changes local markdown. */
export function classifyPullChange(options: {
  priorPath: string | null;
  outPath: string;
  priorBody: string | null;
  newBody: string;
}): PullChangeStatus {
  const { priorPath, outPath, priorBody, newBody } = options;
  if (!priorPath) return "added";
  if (path.resolve(priorPath) !== path.resolve(outPath)) return "moved";
  if (priorBody === newBody) return "unchanged";
  return "updated";
}

/** Fetch one ticket from Jira and write or refresh its local markdown file. */
export function pullTicket(
  ticketKey: string,
  options: PullOptions = {}
): number {
  try {
    const result = pullTicketWrite(ticketKey, options);
    if (isJsonMode({ outputMode: options.outputMode ?? "human" })) {
      printJsonSuccess({ keys: [result.key], count: 1 });
    }
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(`pull ${ticketKey}: ${msg}`, options.outputMode ?? "human");
  }
}

function writePulledIssue(
  data: unknown,
  ticketKey: string,
  options: PullOptions
): PullWriteResult {
  const cwd = options.cwd ?? process.cwd();
  const quiet = options.quiet ?? false;
  const meAccountId = CONFIG.meAccountId;
  const siteHost = normalizeSiteHost(CONFIG.site);

  if (!data || typeof data !== "object") {
    throw new Error(`no data returned for ${ticketKey}`);
  }

  const issue = data as { key?: string; fields?: Record<string, unknown> };
  const key = issue.key;
  if (!key) {
    throw new Error(`no key in response for ${ticketKey}`);
  }

  const fields = issue.fields ?? {};
  const body = formatTicketMarkdown(key, fields, siteHost, meAccountId).body;
  const prior = localTicketPath(key, cwd, options.ticketIndex);
  const parent = resolveStoryParent(fields);
  const outPath = pulledTicketPath(cwd, fields, key, parent);
  let priorBody: string | null = null;
  if (prior && fs.existsSync(prior)) {
    try {
      priorBody = fs.readFileSync(prior, "utf-8");
    } catch {
      priorBody = null;
    }
  }
  const status = classifyPullChange({
    priorPath: priorBody != null ? prior : null,
    outPath,
    priorBody,
    newBody: body
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body, "utf-8");
  if (prior && path.resolve(prior) !== path.resolve(outPath)) {
    fs.unlinkSync(prior);
    options.ticketIndex?.delete(key);
  }
  options.ticketIndex?.set(key, outPath);

  const summary =
    typeof fields.summary === "string" ? fields.summary.trim() : key;
  const rel = path.relative(cwd, outPath) || outPath;

  if (!quiet) {
    printPulled(key, summary, status);
  }

  return {
    key,
    title: summary,
    relPath: rel,
    issueType: issueTypeName(fields),
    status
  };
}

export function pullTicketWrite(
  ticketKey: string,
  options: PullOptions
): PullWriteResult {
  const data = viewWorkitem(ticketKey, { fields: jiraPullFields() });
  return writePulledIssue(data, ticketKey, options);
}

async function pullTicketWriteAsync(
  ticketKey: string,
  options: PullOptions
): Promise<PullWriteResult> {
  const data = await viewWorkitemAsync(ticketKey, {
    fields: jiraPullFields()
  });
  return writePulledIssue(data, ticketKey, options);
}

/** Pull a ticket and optionally its children (prompts on a TTY). */
export async function runPull(
  ticketKey: string,
  options: PullOptions = {}
): Promise<number> {
  try {
    return await runPullFlow(ticketKey, options);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(msg);
    return 1;
  }
}

async function runPullFlow(
  ticketKey: string,
  options: PullOptions
): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const ticketIndex = options.ticketIndex ?? buildLocalTicketIndex(cwd);
  const pullOptions = { ...options, cwd, ticketIndex };
  const jsonMode = isJsonMode({ outputMode: options.outputMode ?? "human" });
  const quiet = options.quiet ?? jsonMode;
  const effectiveOptions = { ...pullOptions, quiet };
  const pulledKeys: string[] = [];
  let pulled = 0;

  const root = pullTicketWrite(ticketKey, effectiveOptions);
  pulled += 1;
  pulledKeys.push(root.key);

  if (options.noChildren) {
    return finishPull(pulled, pulledKeys, effectiveOptions);
  }

  const isRoot = isHierarchyRoot(root.issueType);
  if (!quiet && isRoot) {
    pullLog(`scanning descendants of ${ticketKey}...`);
  }

  const descendantIssues = fetchDescendantIssues(ticketKey, {
    onProgress: quiet ? undefined : pullLog
  });
  const descendants = descendantIssues.map((issue) => issue.key);
  if (descendants.length === 0) {
    return finishPull(pulled, pulledKeys, effectiveOptions);
  }

  let pullChildren = options.withChildren === true || isRoot;
  const canPrompt =
    !pullChildren &&
    !options.noChildren &&
    !jsonMode &&
    process.stdin.isTTY &&
    process.stdout.isTTY;

  if (canPrompt) {
    printChildIssues(descendantIssues);
    pullChildren = await confirm(
      `Pull ${descendants.length} descendant issue(s) too?`,
      true
    );
  }

  if (!pullChildren) {
    return finishPull(pulled, pulledKeys, effectiveOptions);
  }

  if (!quiet) {
    pullLog(`pulling ${descendants.length} descendant issue(s)...`);
    process.stdout.write("\n");
  }

  const limit = createConcurrencyLimiter(PULL_CONCURRENCY);
  const results = await Promise.all(
    descendants.map((key) =>
      limit(async () => {
        try {
          const result = await pullTicketWriteAsync(key, {
            ...effectiveOptions,
            quiet: true
          });
          return { ok: true as const, result };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          printError(`pull ${key}: ${msg}`);
          return { ok: false as const };
        }
      })
    )
  );

  let code = 0;
  for (const entry of results) {
    if (!entry.ok) {
      code = 1;
      continue;
    }
    pulled += 1;
    pulledKeys.push(entry.result.key);
    if (!quiet) {
      printPulled(entry.result.key, entry.result.title, entry.result.status);
    }
  }

  const pullCode = finishPull(pulled, pulledKeys, effectiveOptions);
  return code !== 0 ? code : pullCode;
}

function finishPull(
  count: number,
  keys: string[],
  options: PullOptions
): number {
  const jsonMode = isJsonMode({ outputMode: options.outputMode ?? "human" });
  if (jsonMode) {
    printJsonSuccess({ keys, count });
    return 0;
  }
  return 0;
}

/** Re-pull every ticket already present under `jira/`. */
export async function pullAll(
  cwd = process.cwd(),
  options: Omit<PullOptions, "cwd"> = {}
): Promise<number> {
  const tickets = listLocalTickets(cwd);
  if (tickets.length === 0) {
    return failCommand("no tickets under jira/", options.outputMode ?? "human");
  }

  const ticketIndex = buildLocalTicketIndex(cwd);
  const jsonMode = isJsonMode({ outputMode: options.outputMode ?? "human" });
  const quiet = options.quiet ?? jsonMode;
  const limit = createConcurrencyLimiter(PULL_CONCURRENCY);
  const pulledKeys: string[] = [];
  const results = await Promise.all(
    tickets.map((ticket) =>
      limit(async () => {
        try {
          const result = await pullTicketWriteAsync(ticket.key, {
            ...options,
            cwd,
            quiet: true,
            ticketIndex
          });
          return { ok: true as const, result };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          printError(`pull ${ticket.key}: ${msg}`);
          return { ok: false as const };
        }
      })
    )
  );

  let code = 0;
  let pulled = 0;
  for (const result of results) {
    if (!result.ok) {
      code = 1;
      continue;
    }
    pulled += 1;
    pulledKeys.push(result.result.key);
    if (!quiet) {
      printPulled(result.result.key, result.result.title, result.result.status);
    }
  }
  const summaryCode = finishPull(pulled, pulledKeys, { ...options, quiet });
  return code !== 0 ? code : summaryCode;
}

/** Safe folder name from a ticket title and key (no `.md` suffix). */
export function ticketFolderName(
  fields: Record<string, unknown>,
  key: string
): string {
  return ticketMarkdownFilename(fields, key).replace(/\.md$/, "");
}

/** Run `jira pull [KEY|URL]`. */
export async function runPullCommand(
  argv: string[],
  options: PullOptions = {}
): Promise<number> {
  const input = argv[3];
  if (!input) {
    return pullAll(undefined, options);
  }
  const key = parseJiraKey(input);
  if (!key) {
    return failCommand(
      `pull: not a valid Jira key or URL: ${input}`,
      options.outputMode ?? "human"
    );
  }
  return runPull(key, options);
}

/** Run `jira <KEY|URL>` (same as pull one ticket). */
export async function runPullTicket(
  key: string,
  options: PullOptions = {}
): Promise<number> {
  return runPull(key, options);
}
