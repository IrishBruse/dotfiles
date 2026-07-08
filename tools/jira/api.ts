import { enrichIssuesWithViewFieldsAsync as enrichIssuesWithViewFieldsImpl } from "./commands/board/sync.ts";
import { buildJiraTicketsSkillContent as buildJiraTicketsSkillContentImpl } from "./commands/board/skill.ts";
import {
  run as runBoardSyncImpl,
  runWithResult as runWithResultImpl
} from "./commands/board/sync.ts";
import {
  sprintsInRetentionWindow as sprintsInRetentionWindowImpl,
  writeBoard as writeBoardImpl,
  SPRINT_RETENTION_BUFFER_MS as sprintRetentionBufferMs
} from "./commands/board/write.ts";
import { CONFIG as jiraConfig } from "./CONFIG.ts";
import {
  assigneeLabel as assigneeLabelImpl,
  assigneeRecord as assigneeRecordImpl,
  classifyFolder as classifyFolderImpl,
  formatTicketMarkdown as formatTicketMarkdownImpl,
  JIRA_SEARCH_FIELDS as jiraSearchFields,
  JIRA_VIEW_EXTRA_FIELDS as jiraViewExtraFields,
  normalizeSiteHost as normalizeSiteHostImpl,
  statusBucketFromFields as statusBucketFromFieldsImpl
} from "./format.ts";

/** Read-only Jira CLI configuration. */
export const CONFIG: typeof jiraConfig = jiraConfig;

/** Fields allowed by `acli jira workitem search --fields`. */
export const JIRA_SEARCH_FIELDS: string = jiraSearchFields;

/** Fields returned by `acli jira workitem view` but not search. */
export const JIRA_VIEW_EXTRA_FIELDS: string = jiraViewExtraFields;

/** Keep tickets from sprints within this many days before start and after end. */
export const SPRINT_RETENTION_BUFFER_MS: number = sprintRetentionBufferMs;

/** Board folder for synced ticket markdown. */
export type Folder = "me" | "unassigned" | "team" | "misc";

/** Status bucket for board grouping. */
export type StatusBucket =
  | "todo"
  | "inProgress"
  | "codeReview"
  | "inTest"
  | "done";

/** Parsed local ticket markdown under ./jira/. */
export type LocalTicket = {
  key: string;
  path: string;
  relPath: string;
  typeDir: string;
  title: string;
  assigned: string;
  featureTeam: string;
  issueType: string;
  url: string;
  status: string;
  created: string;
  updated: string;
  description: string;
};

/** Child issue summary from Jira search or view. */
export type ChildIssue = {
  key: string;
  summary: string;
  issueType: string;
};

/** Jira board sprint metadata from acli list-sprints. */
export type BoardSprint = {
  id: number;
  startDate?: string;
  endDate?: string;
  state?: string;
};

/** Result of writing ticket markdown to the board references tree. */
export type WriteBoardResult = {
  counts: Record<Folder, number>;
  added: string[];
  updated: string[];
  moved: Array<{ key: string; from: Folder; to: Folder }>;
  archived: string[];
  deleted: string[];
};

/** One ticket row in the jira-board skill summary. */
export type JiraSkillTicket = {
  key: string;
  summary: string;
  assignee: string;
};

/** Tickets grouped by status within one board section. */
export type JiraSkillSection = {
  heading: string;
  statuses: Record<StatusBucket, JiraSkillTicket[]>;
};

/** Structured board summary shared by SKILL.md and sprint.json. */
export type JiraTicketsSkillContent = {
  name: string;
  description: string;
  sections: {
    myTickets: JiraSkillSection;
    teammates: JiraSkillSection;
    unassigned: JiraSkillSection;
    misc: JiraSkillSection;
  };
};

/** Board sync exit status with optional error message. */
export type SyncResult = {
  code: number;
  error?: string;
};

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
