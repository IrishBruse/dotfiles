/**
 * `jira pull` -- fetch tickets into `jira/<type>/<title> - <KEY>.md`.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { runAcliJson, runAcliJsonAsync } from "../../.lib/acli.ts";
import { createConcurrencyLimiter } from "../../.lib/concurrency.ts";
import { CONFIG } from "../lib/CONFIG.ts";
import {
  fetchDescendantIssues,
  parentKeyFromFields,
  parentSummaryFromFields
} from "../lib/children.ts";
import {
  formatTicketMarkdown,
  isHierarchyRoot,
  issueTypeName,
  JIRA_PULL_FIELDS,
  normalizeSiteHost
} from "../lib/format.ts";
import { parseJiraKey } from "../lib/jiraInput.ts";
import {
  buildLocalTicketIndex,
  listLocalTickets,
  localTicketPath
} from "../lib/local.ts";
import {
  printChildIssues,
  printError,
  printPulled,
  printPullSummary,
  pullLog
} from "../lib/output.ts";
import { confirm } from "../lib/prompt.ts";

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

  const data = runAcliJson([
    "jira",
    "workitem",
    "view",
    parentKey,
    "--fields",
    "summary",
    "--json"
  ]);
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
};

/** Fetch one ticket from Jira and write or refresh its local markdown file. */
export function pullTicket(
  ticketKey: string,
  options: PullOptions = {}
): number {
  try {
    pullTicketWrite(ticketKey, options);
    return 0;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    printError(`pull ${ticketKey}: ${msg}`);
    return 1;
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
    printPulled(key, summary);
  }

  return {
    key,
    title: summary,
    relPath: rel,
    issueType: issueTypeName(fields)
  };
}

export function pullTicketWrite(
  ticketKey: string,
  options: PullOptions
): PullWriteResult {
  const data = runAcliJson([
    "jira",
    "workitem",
    "view",
    ticketKey,
    "--fields",
    JIRA_PULL_FIELDS,
    "--json"
  ]);
  return writePulledIssue(data, ticketKey, options);
}

async function pullTicketWriteAsync(
  ticketKey: string,
  options: PullOptions
): Promise<PullWriteResult> {
  const data = await runAcliJsonAsync([
    "jira",
    "workitem",
    "view",
    ticketKey,
    "--fields",
    JIRA_PULL_FIELDS,
    "--json"
  ]);
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
  let pulled = 0;

  const root = pullTicketWrite(ticketKey, pullOptions);
  pulled += 1;

  if (options.noChildren) {
    if (!options.quiet) printPullSummary(pulled);
    return 0;
  }

  const isRoot = isHierarchyRoot(root.issueType);
  if (!options.quiet && isRoot) {
    pullLog(`scanning descendants of ${ticketKey}...`);
  }

  const descendantIssues = fetchDescendantIssues(ticketKey, {
    onProgress: options.quiet ? undefined : pullLog
  });
  const descendants = descendantIssues.map((issue) => issue.key);
  if (descendants.length === 0) {
    if (!options.quiet) printPullSummary(pulled);
    return 0;
  }

  let pullChildren = options.withChildren === true || isRoot;
  const canPrompt =
    !pullChildren &&
    !options.noChildren &&
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
    if (!options.quiet) printPullSummary(pulled);
    return 0;
  }

  if (!options.quiet) {
    pullLog(`pulling ${descendants.length} descendant issue(s)...`);
    process.stdout.write("\n");
  }

  const limit = createConcurrencyLimiter(PULL_CONCURRENCY);
  const results = await Promise.all(
    descendants.map((key) =>
      limit(async () => {
        try {
          const result = await pullTicketWriteAsync(key, {
            ...pullOptions,
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
    if (!options.quiet) {
      printPulled(entry.result.key, entry.result.title);
    }
  }

  if (!options.quiet) printPullSummary(pulled);
  return code;
}

/** Re-pull every ticket already present under `jira/`. */
export async function pullAll(
  cwd = process.cwd(),
  options: Omit<PullOptions, "cwd"> = {}
): Promise<number> {
  const tickets = listLocalTickets(cwd);
  if (tickets.length === 0) {
    printError("no tickets under jira/");
    return 1;
  }

  const ticketIndex = buildLocalTicketIndex(cwd);
  const limit = createConcurrencyLimiter(PULL_CONCURRENCY);
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
    if (!options.quiet) {
      printPulled(result.result.key, result.result.title);
    }
  }
  if (!options.quiet) printPullSummary(pulled);
  return code;
}

/** Safe folder name from a ticket title and key (no `.md` suffix). */
export function ticketFolderName(
  fields: Record<string, unknown>,
  key: string
): string {
  return ticketMarkdownFilename(fields, key).replace(/\.md$/, "");
}

/** Run `jira pull [KEY|URL]`. */
export async function runPullCommand(argv: string[]): Promise<number> {
  const input = argv[3];
  if (!input) {
    return pullAll();
  }
  const key = parseJiraKey(input);
  if (!key) {
    printError(`pull: not a valid Jira key or URL: ${input}`);
    return 1;
  }
  return runPull(key);
}

/** Run `jira <KEY|URL>` (same as pull one ticket). */
export async function runPullTicket(key: string): Promise<number> {
  return runPull(key);
}
