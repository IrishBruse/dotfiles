/**
 * `jira show` -- print one issue as markdown and keep a `~/jira` copy current.
 */
import fs from "node:fs";
import path from "node:path";
import { homedir } from "node:os";
import process from "node:process";

import { viewWorkitem, viewWorkitemAsync } from "../../lib/acli-jira.ts";
import { flagBool, parseSubcommandArgv } from "../../lib/argv.ts";
import { CONFIG } from "../../lib/CONFIG.ts";
import { formatTicketMarkdown, jiraPullFields, normalizeSiteHost } from "../../lib/format.ts";
import { parseJiraKey } from "../../lib/jiraInput.ts";
import { localTicketPath } from "../../lib/local.ts";
import { pullTicketWrite, pullTicketWriteAsync } from "../local/pull.ts";
import type { CommandOptions } from "../../lib/output-mode.ts";
import { HUMAN_OUTPUT, isJsonMode } from "../../lib/output-mode.ts";
import { failCommand, printJsonSuccess } from "../../lib/output.ts";

/** Insert or replace `path:` as the first frontmatter field for show output. */
export function injectPathIntoFrontmatter(
  markdown: string,
  filePath: string
): string {
  const pathLine = `path: ${path.resolve(filePath)}`;
  const open = "---\n";
  if (!markdown.startsWith(open)) {
    return markdown;
  }

  const rest = markdown.slice(open.length);
  const closeIdx = rest.indexOf("\n---");
  if (closeIdx === -1) {
    return markdown;
  }

  const fm = rest.slice(0, closeIdx);
  const after = rest.slice(closeIdx);
  const lines = fm.split("\n").filter((line) => !/^path:\s/.test(line));
  const newFm = [pathLine, ...lines].join("\n");
  return `${open}${newFm}${after}`;
}

/** Local copies older than this are refetched by `jira show`. */
export const LOCAL_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type LocalShow = {
  path: string;
  markdown: string;
  ageMs: number | null;
  stale: boolean;
};

/**
 * Age of a pulled ticket from its frontmatter `updated` field.
 * @return Milliseconds since `updated`, or null when it is missing or unparseable.
 */
export function localShowAgeMs(markdown: string, now = Date.now()): number | null {
  const fm = /^---\n([\s\S]*?)\n---/.exec(markdown);
  if (!fm?.[1]) return null;
  const updated = /^updated:\s*(.+)$/m.exec(fm[1])?.[1]?.trim() ?? "";
  const value = /^".*"$/.test(updated) ? updated.slice(1, -1) : updated;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : now - ts;
}

/** Load local ticket markdown when present and remote was not requested. */
export function readLocalShowMarkdown(
  key: string,
  options: {
    cwd?: string;
    remote?: boolean;
    fieldsExplicit?: boolean;
    now?: number;
  } = {}
): LocalShow | null {
  if (options.remote || options.fieldsExplicit) return null;
  const filePath = localTicketPath(key, options.cwd ?? homedir());
  if (!filePath) return null;
  const resolved = path.resolve(filePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  const ageMs = localShowAgeMs(raw, options.now);
  return {
    path: resolved,
    markdown: injectPathIntoFrontmatter(raw, resolved),
    ageMs,
    stale: ageMs === null || ageMs > LOCAL_MAX_AGE_MS
  };
}

/** Format a live workitem view into the same markdown shape as `jira show`. */
export function formatRemoteShowMarkdown(
  key: string,
  data: unknown
): { key: string; markdown: string } | null {
  if (!data || typeof data !== "object") return null;
  const issue = data as { key?: string; fields?: Record<string, unknown> };
  const issueKey = issue.key ?? key;
  const body = formatTicketMarkdown(
    issueKey,
    issue.fields ?? {},
    normalizeSiteHost(CONFIG.site),
    CONFIG.meAccountId
  ).body;
  return {
    key: issueKey,
    markdown: body.endsWith("\n") ? body : `${body}\n`
  };
}

export type ShowResult = {
  source: "local" | "remote";
  key: string;
  path?: string;
  stale?: boolean;
  markdown: string;
};

function withTrailingNewline(markdown: string): string {
  return markdown.endsWith("\n") ? markdown : `${markdown}\n`;
}

type ShowResolveContext = {
  key: string;
  cwd: string;
  fieldsExplicit: boolean;
  fields: string;
  localOnly: boolean;
  local: LocalShow | null;
};

function parseShowResolve(
  argv: string[],
  startIndex: number
): ShowResolveContext {
  const parsed = parseSubcommandArgv(argv, startIndex);
  const input = parsed.positional[0];
  if (!input) {
    throw new Error("show: missing Jira key or URL");
  }

  const key = parseJiraKey(input);
  if (!key) {
    throw new Error(`show: not a valid Jira key or URL: ${input}`);
  }

  const cwd = homedir();
  const fieldsExplicit = parsed.flags.has("fields");
  const fields = fieldsExplicit
    ? String(parsed.flags.get("fields"))
    : jiraPullFields();
  const remote = flagBool(parsed.flags, "remote");
  const localOnly = flagBool(parsed.flags, "local");
  const local = readLocalShowMarkdown(key, { cwd, remote, fieldsExplicit });

  return { key, cwd, fieldsExplicit, fields, localOnly, local };
}

function asLocalShow(key: string, entry: LocalShow): ShowResult {
  return {
    source: "local",
    key,
    path: entry.path,
    stale: entry.stale,
    markdown: withTrailingNewline(entry.markdown)
  };
}

function remoteShowFromCache(
  key: string,
  cwd: string
): ShowResult | null {
  const cached = readLocalShowMarkdown(key, { cwd, now: Date.now() });
  if (!cached) return null;
  return {
    source: "remote",
    key,
    path: cached.path,
    markdown: withTrailingNewline(cached.markdown)
  };
}

function remoteShowFromView(
  key: string,
  data: unknown,
  cachePath: string | undefined
): ShowResult {
  const formatted = formatRemoteShowMarkdown(key, data);
  if (!formatted) {
    throw new Error("no data returned");
  }
  return {
    source: "remote",
    key: formatted.key,
    path: cachePath,
    markdown: withTrailingNewline(formatted.markdown)
  };
}

/**
 * Resolve `show` arguments to ticket markdown.
 * A fresh local copy wins. A missing or stale copy is fetched live, written to
 * `~/jira`, and the stale copy is only used when that fetch fails.
 * @param argv - Full argv (`show` at `startIndex - 1`).
 * @return Markdown plus the source it came from.
 */
export function resolveShow(argv: string[], startIndex = 3): ShowResult {
  const ctx = parseShowResolve(argv, startIndex);
  const { key, cwd, fieldsExplicit, fields, localOnly, local } = ctx;

  if (local && (localOnly || !local.stale)) {
    return asLocalShow(key, local);
  }

  try {
    let cachePath: string | undefined;
    if (!localOnly) {
      pullTicketWrite(key, { quiet: true, cwd });
      cachePath = localTicketPath(key, cwd) ?? undefined;
    }

    if (!fieldsExplicit) {
      const cached = remoteShowFromCache(key, cwd);
      if (cached) return cached;
    }

    return remoteShowFromView(
      key,
      viewWorkitem(key, { fields }),
      cachePath
    );
  } catch (e) {
    if (local) return asLocalShow(key, local);
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`show ${key}: ${msg}`);
  }
}

/**
 * Async `resolveShow` for batch and other concurrent callers.
 * Same local-first rules as `resolveShow`.
 */
export async function resolveShowAsync(
  argv: string[],
  startIndex = 3
): Promise<ShowResult> {
  const ctx = parseShowResolve(argv, startIndex);
  const { key, cwd, fieldsExplicit, fields, localOnly, local } = ctx;

  if (local && (localOnly || !local.stale)) {
    return asLocalShow(key, local);
  }

  try {
    let cachePath: string | undefined;
    if (!localOnly) {
      await pullTicketWriteAsync(key, { quiet: true, cwd });
      cachePath = localTicketPath(key, cwd) ?? undefined;
    }

    if (!fieldsExplicit) {
      const cached = remoteShowFromCache(key, cwd);
      if (cached) return cached;
    }

    return remoteShowFromView(
      key,
      await viewWorkitemAsync(key, { fields }),
      cachePath
    );
  } catch (e) {
    if (local) return asLocalShow(key, local);
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`show ${key}: ${msg}`);
  }
}

/** Run `jira show <KEY|URL> [--fields ...] [--remote] [--local]`. */
export function runShowCommand(
  argv: string[],
  options: CommandOptions = HUMAN_OUTPUT
): number {
  let result: ShowResult;
  try {
    result = resolveShow(argv);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return failCommand(msg, options.outputMode);
  }

  if (isJsonMode(options)) {
    printJsonSuccess(result);
    return 0;
  }
  process.stdout.write(result.markdown);
  return 0;
}
