/**
 * Fetch Jira tickets and save to `jira/<type>/<title> - <KEY>.md` in cwd.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { CONFIG } from "./CONFIG.ts";
import { runAcliJson, runAcliJsonAsync } from "./acli.ts";
import { fetchChildIssues, fetchDescendantIssues } from "./children.ts";
import {
  assigneeLabel,
  formatTicketMarkdown,
  isHierarchyRoot,
  issueTypeName,
  JIRA_PULL_FIELDS
} from "./format.ts";
import { listLocalTickets, localTicketPath } from "./local.ts";
import {
  printChildIssues,
  printError,
  printPulled,
  printPullSummary,
  pullLog
} from "./output.ts";
import { confirm } from "./prompt.ts";

/** Max concurrent `acli` fetches during `jira sync` / `jira pull` with no key. */
const PULL_ALL_CONCURRENCY = 4;

function createPullLimiter(concurrency: number) {
  const queue: (() => void)[] = [];
  let active = 0;
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const run = () => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            const next = queue.shift();
            if (next) next();
          });
      };
      if (active < concurrency) run();
      else queue.push(run);
    });
  };
}

/** Lowercase slug for `jira/<type>/` paths (e.g. `Epic` -> `epic`). */
export function issueTypeSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Jira summary for filenames; falls back to the issue key. */
export function ticketTitleFromFields(
  fields: Record<string, unknown>,
  key: string
): string {
  const summary = typeof fields.summary === "string" ? fields.summary.trim() : "";
  return summary || key;
}

/** Safe markdown filename from the ticket title (e.g. `[DTC] Make foo - NOVACORE-1.md`). */
export function ticketMarkdownFilename(
  fields: Record<string, unknown>,
  key: string
): string {
  const keySuffix = ` - ${key}`;
  const title = ticketTitleFromFields(fields, key)
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
  key: string
): string {
  return path.join(
    cwd,
    "jira",
    issueTypeSlug(issueTypeName(fields)),
    ticketMarkdownFilename(fields, key)
  );
}

export type PullOptions = {
  cwd?: string;
  quiet?: boolean;
  /** When true, skip the child-issue prompt and never pull children. */
  noChildren?: boolean;
  /** When true, pull children without prompting. */
  withChildren?: boolean;
};

type PullWriteResult = {
  key: string;
  title: string;
  relPath: string;
  issueType: string;
};

/** Fetch one ticket from Jira and write or refresh its local markdown file. */
export function pullTicket(ticketKey: string, options: PullOptions = {}): number {
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
  const siteHost = CONFIG.site.replace(/^https?:\/\//, "").replace(/\/$/, "");

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
  const prior = localTicketPath(key, cwd);
  const outPath = pulledTicketPath(cwd, fields, key);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body, "utf-8");
  if (prior && path.resolve(prior) !== path.resolve(outPath)) {
    fs.unlinkSync(prior);
  }

  const summary =
    typeof fields.summary === "string" ? fields.summary.trim() : key;
  const rel = path.relative(cwd, outPath) || outPath;

  if (!quiet) {
    printPulled(key, summary, rel);
  }

  return { key, title: summary, relPath: rel, issueType: issueTypeName(fields) };
}

function pullTicketWrite(
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
export async function run(
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
  let pulled = 0;

  const root = pullTicketWrite(ticketKey, { ...options, cwd });
  pulled += 1;

  if (options.noChildren) {
    if (!options.quiet) printPullSummary(pulled);
    return 0;
  }

  if (!options.quiet && isHierarchyRoot(root.issueType)) {
    pullLog(`scanning descendants of ${ticketKey}...`);
  }

  const descendants = fetchDescendantIssues(ticketKey, {
    onProgress: options.quiet ? undefined : pullLog
  }).map((issue) => issue.key);
  if (descendants.length === 0) {
    if (!options.quiet) printPullSummary(pulled);
    return 0;
  }

  let pullChildren =
    options.withChildren === true || isHierarchyRoot(root.issueType);
  const canPrompt =
    !pullChildren &&
    !options.noChildren &&
    process.stdin.isTTY &&
    process.stdout.isTTY;

  if (canPrompt) {
    printChildIssues(fetchChildIssues(ticketKey));
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
  let code = 0;
  for (const key of descendants) {
    try {
      if (!options.quiet) pullLog(`fetching ${key}...`);
      pullTicketWrite(key, { ...options, cwd, quiet: false });
      pulled += 1;
    } catch (e) {
      code = 1;
      const msg = e instanceof Error ? e.message : String(e);
      printError(`pull ${key}: ${msg}`);
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

  const limit = createPullLimiter(PULL_ALL_CONCURRENCY);
  const results = await Promise.all(
    tickets.map((ticket) =>
      limit(async () => {
        try {
          await pullTicketWriteAsync(ticket.key, {
            ...options,
            cwd,
            quiet: true
          });
          return { ok: true as const, ticket };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          printError(`pull ${ticket.key}: ${msg}`);
          return { ok: false as const, ticket };
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
      printPulled(result.ticket.key, result.ticket.title, result.ticket.relPath);
    }
  }
  if (!options.quiet) printPullSummary(pulled);
  return code;
}

/** @deprecated Use {@link localTicketPath}. */
export function findCwdJiraTicketMarkdown(
  key: string,
  cwd = process.cwd()
): string | null {
  return localTicketPath(key, cwd);
}
