/**
 * Fetch a single Jira ticket by key and save to `jira/<type>/<title>.md` in cwd.
 * Usage: jira pull <KEY|URL>
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { CONFIG } from "./CONFIG.ts";
import {
  assigneeLabel,
  formatTicketMarkdown,
  issueTypeName
} from "./format.ts";

const ACLI = "acli";
const SEARCH_FIELDS =
  "key,summary,assignee,issuetype,description,status,created,updated";

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

/** Safe markdown filename from the ticket title (e.g. `[DTC] Make foo.md`). */
export function ticketMarkdownFilename(
  fields: Record<string, unknown>,
  key: string
): string {
  const title = ticketTitleFromFields(fields, key)
    .replace(/[\r\n]+/g, " ")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 200)
    .trim();
  return `${title || key}.md`;
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

/** True when markdown frontmatter links to a Jira issue key. */
export function jiraTicketKeyInMarkdown(content: string, key: string): boolean {
  return content.includes(`/browse/${key}`);
}

function log(msg: string): void {
  process.stderr.write(`jira pull: ${msg}\n`);
}

function runAcliJson(acli: string, args: string[]): unknown {
  const r = spawnSync(acli, args, {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024
  });
  if (r.error) {
    const msg = r.error instanceof Error ? r.error.message : String(r.error);
    throw new Error(`Failed to run ${acli}: ${msg}`);
  }
  if (r.status !== 0) {
    const err = r.stderr?.trim() || r.stdout?.trim() || `exit ${r.status}`;
    throw new Error(err);
  }
  const raw = r.stdout?.trim() ?? "";
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (e) {
    const hint = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Expected JSON from acli (${hint}); got: ${raw.slice(0, 200)}…`
    );
  }
}

/** First `jira/<type>/*.md` under cwd whose frontmatter matches `key`, if any. */
export function findCwdJiraTicketMarkdown(
  key: string,
  cwd = process.cwd()
): string | null {
  const jiraDir = path.join(cwd, "jira");
  if (!fs.existsSync(jiraDir)) return null;
  for (const ent of fs.readdirSync(jiraDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const typeDir = path.join(jiraDir, ent.name);
    for (const file of fs.readdirSync(typeDir)) {
      if (!file.endsWith(".md")) continue;
      const p = path.join(typeDir, file);
      const head = fs.readFileSync(p, "utf-8").slice(0, 2048);
      if (jiraTicketKeyInMarkdown(head, key)) return p;
    }
  }
  return null;
}

/** Run the pull subcommand; returns exit code. */
export function run(ticketKey: string): number {
  try {
    return runImpl(ticketKey);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`jira pull: ${msg}\n`);
    return 1;
  }
}

function runImpl(ticketKey: string): number {
  const meAccountId = CONFIG.meAccountId;
  let siteHost = CONFIG.site.replace(/^https?:\/\//, "").replace(/\/$/, "");

  log(`fetching ${ticketKey} via acli…`);

  const data = runAcliJson(ACLI, [
    "jira",
    "workitem",
    "view",
    ticketKey,
    "--fields",
    SEARCH_FIELDS,
    "--json"
  ]);

  if (!data || typeof data !== "object") {
    process.stderr.write(`jira pull: no data returned for ${ticketKey}\n`);
    return 1;
  }

  const issue = data as { key?: string; fields?: Record<string, unknown> };
  const key = issue.key;
  if (!key) {
    process.stderr.write(`jira pull: no key in response for ${ticketKey}\n`);
    return 1;
  }

  const fields = issue.fields ?? {};
  const body = formatTicketMarkdown(key, fields, siteHost, meAccountId).body;
  const cwd = process.cwd();
  const prior = findCwdJiraTicketMarkdown(key, cwd);
  const outPath = pulledTicketPath(cwd, fields, key);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, body, "utf-8");
  if (prior && path.resolve(prior) !== path.resolve(outPath)) {
    fs.unlinkSync(prior);
  }

  const summary =
    typeof fields.summary === "string" ? fields.summary : "(no summary)";
  const assignee = assigneeLabel(
    fields.assignee as Record<string, unknown> | null | undefined
  );
  const rel = path.relative(cwd, outPath) || outPath;
  log(`saved ${key}: ${summary} → ${outPath}`);
  process.stdout.write(`Pulled ${key} (${assignee}) → ${rel}\n`);
  return 0;
}
