import { enrichIssuesWithViewFieldsAsync as enrichIssuesWithViewFieldsImpl } from "../commands/workspace/sync.ts";
import { buildJiraTicketsSkillContent as buildJiraTicketsSkillContentImpl } from "../commands/workspace/skill.ts";
import {
  run as runBoardSyncImpl,
  runWithResult as runWithResultImpl
} from "../commands/workspace/sync.ts";
import {
  sprintsInRetentionWindow as sprintsInRetentionWindowImpl,
  writeBoard as writeBoardImpl,
  SPRINT_RETENTION_BUFFER_MS as sprintRetentionBufferMs
} from "../commands/workspace/write.ts";
import { CONFIG as jiraConfig } from "./CONFIG.ts";
import {
  assigneeLabel as assigneeLabelImpl,
  assigneeRecord as assigneeRecordImpl,
  classifyFolder as classifyFolderImpl,
  formatTicketMarkdown as formatTicketMarkdownImpl,
  JIRA_SEARCH_FIELDS as jiraSearchFields,
  jiraViewExtraFields as jiraViewExtraFieldsImpl,
  jiraPullFields as jiraPullFieldsImpl,
  normalizeSiteHost as normalizeSiteHostImpl,
  statusBucketFromFields as statusBucketFromFieldsImpl
} from "./format.ts";
import type {
  BoardSprint,
  Folder,
  JiraTicketsSkillContent,
  StatusBucket,
  SyncResult,
  WriteBoardResult
} from "./types.ts";

export type {
  BoardSprint,
  ChildIssue,
  Folder,
  JiraSkillSection,
  JiraSkillTicket,
  JiraTicketsSkillContent,
  LocalTicket,
  StatusBucket,
  SyncResult,
  WriteBoardResult
} from "./types.ts";

/** Read-only Jira CLI configuration. */
export const CONFIG: typeof jiraConfig = jiraConfig;

/** Fields allowed by `acli jira workitem search --fields`. */
export const JIRA_SEARCH_FIELDS: string = jiraSearchFields;

/** Fields returned by `acli jira workitem view` but not search. */
export function jiraViewExtraFields(): string {
  return jiraViewExtraFieldsImpl();
}

/** Search plus view-only fields for pull/show. */
export function jiraPullFields(): string {
  return jiraPullFieldsImpl();
}

/** Keep tickets from sprints within this many days before start and after end. */
export const SPRINT_RETENTION_BUFFER_MS: number = sprintRetentionBufferMs;

/**
 * Sync Jira board into `~/.agents/skills/jira-board/`.
 * @return Exit code (0 on success).
 */
export function runBoardSync(): Promise<number> {
  return runBoardSyncImpl();
}

/**
 * Sync with structured result for HTTP handlers.
 * @return Exit code and optional error message.
 */
export function runBoardSyncWithResult(): Promise<SyncResult> {
  return runWithResultImpl();
}

/**
 * Write fetched issues to the board references tree.
 * @param issues Jira search results.
 * @param options Output paths, account id, and sprint metadata.
 * @return Counts and change lists.
 */
export function writeBoard(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  options: {
    outputRoot: string;
    meAccountId: string;
    siteHost: string;
    clean: boolean;
    boardSprints: BoardSprint[];
    nowMs?: number;
  }
): WriteBoardResult {
  return writeBoardImpl(issues, options);
}

/**
 * Build structured jira-board skill content from issues.
 * @param issues Jira issues with fields.
 * @param meAccountId Account id for folder classification.
 * @return Skill sections grouped by assignee and status.
 */
export function buildJiraTicketsSkillContent(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  meAccountId: string
): JiraTicketsSkillContent {
  return buildJiraTicketsSkillContentImpl(issues, meAccountId);
}

/**
 * Filter sprints within the retention window around start/end dates.
 * @param sprints Board sprints from acli.
 * @param nowMs Reference time (defaults to now).
 * @return Sprints in the retention window.
 */
export function sprintsInRetentionWindow(
  sprints: BoardSprint[],
  nowMs?: number
): BoardSprint[] {
  return sprintsInRetentionWindowImpl(sprints, nowMs);
}

/**
 * Format one issue as local markdown with frontmatter.
 * @param key Issue key.
 * @param fields Jira fields object.
 * @param siteHost Atlassian site host.
 * @param meAccountId Account id for folder classification.
 * @return Target folder and markdown body.
 */
export function formatTicketMarkdown(
  key: string,
  fields: Record<string, unknown>,
  siteHost: string,
  meAccountId: string
): { folder: Folder; body: string } {
  return formatTicketMarkdownImpl(key, fields, siteHost, meAccountId);
}

/**
 * Classify an issue into me, team, unassigned, or misc folder.
 * @param assignee Jira assignee object or null.
 * @param meAccountId Current user account id.
 * @return Board folder name.
 */
export function classifyFolder(
  assignee: Record<string, unknown> | null | undefined,
  meAccountId: string
): Folder {
  return classifyFolderImpl(assignee, meAccountId);
}

/**
 * Human-readable assignee label.
 * @param assignee Jira assignee object or null.
 * @return Display name or Unassigned.
 */
export function assigneeLabel(
  assignee: Record<string, unknown> | null | undefined
): string {
  return assigneeLabelImpl(assignee);
}

/**
 * Coerce unknown assignee value to a record or null.
 * @param value Raw assignee field from Jira.
 * @return Assignee record or null.
 */
export function assigneeRecord(value: unknown): Record<string, unknown> | null {
  return assigneeRecordImpl(value);
}

/**
 * Map Jira status fields to a board status bucket.
 * @param fields Jira issue fields.
 * @return Status bucket id.
 */
export function statusBucketFromFields(
  fields: Record<string, unknown>
): StatusBucket {
  return statusBucketFromFieldsImpl(fields);
}

/**
 * Merge view-only fields into search results (async, concurrent).
 * @param issues Issues to enrich in place.
 * @param fields Comma-separated field list for workitem view.
 * @param acli Path to acli binary.
 */
export function enrichIssuesWithViewFields(
  issues: Array<{ key?: string; fields?: Record<string, unknown> }>,
  fields: string,
  acli?: string
): Promise<void> {
  return enrichIssuesWithViewFieldsImpl(issues, fields, acli);
}

/**
 * Strip scheme and trailing slash from a Jira site host.
 * @param host Site host or URL.
 * @return Hostname only.
 */
export function normalizeSiteHost(host: string): string {
  return normalizeSiteHostImpl(host);
}
