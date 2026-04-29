/**
 * Fetch a single Jira ticket by key and save to references/misc/<KEY>.md.
 * Usage: jira pull <KEY|URL>
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { CONFIG } from "../CONFIG.ts";
import { formatTicketMarkdown, classifyFolder, assigneeLabel, issueDescriptionMarkdown } from "./sync.ts";

const ACLI = "acli";
const SEARCH_FIELDS = "key,summary,assignee,issuetype,description,status";

/** Skill folder: `<dotfiles>/home/.agents/skills/jira-tickets/` */
const JIRA_TICKETS_SKILL_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "home",
  ".agents",
  "skills",
  "jira-tickets",
);

const MISC_DIR = path.join(JIRA_TICKETS_SKILL_DIR, "references", "misc");

function log(msg: string): void {
  process.stderr.write(`jira pull: ${msg}\n`);
}

function runAcliJson(acli: string, args: string[]): unknown {
  const r = spawnSync(acli, args, {
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
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
      `Expected JSON from acli (${hint}); got: ${raw.slice(0, 200)}…`,
    );
  }
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
    "--id",
    ticketKey,
    "--fields",
    SEARCH_FIELDS,
    "--json",
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

  fs.mkdirSync(MISC_DIR, { recursive: true });
  const outPath = path.join(MISC_DIR, `${key}.md`);
  fs.writeFileSync(outPath, body, "utf-8");

  const summary = typeof fields.summary === "string" ? fields.summary : "(no summary)";
  const assignee = assigneeLabel(fields.assignee as Record<string, unknown> | null | undefined);
  log(`saved ${key}: ${summary} → ${outPath}`);
  process.stdout.write(`Pulled ${key} (${assignee}) → references/misc/${key}.md\n`);
  return 0;
}
