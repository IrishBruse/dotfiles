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

/** Local pull result for one ticket file. */
export type PullChangeStatus = "added" | "updated" | "moved" | "deleted" | "unchanged";

/** Child issue summary from Jira search or view. */
export type ChildIssue = {
  key: string;
  summary: string;
  issueType: string;
};

/** Jira board sprint metadata from acli list-sprints. */
export type BoardSprint = {
  id: number;
  name?: string;
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

/** One ticket row in the cached board summary. */
export type BoardTicket = {
  key: string;
  summary: string;
  assignee: string;
};

/** Tickets grouped by status within one board section. */
export type BoardSection = {
  heading: string;
  statuses: Record<StatusBucket, BoardTicket[]>;
};

/** Board sections keyed by assignee group. */
export type BoardSections = {
  myTickets: BoardSection;
  teammates: BoardSection;
  unassigned: BoardSection;
  misc: BoardSection;
};

/** Structured board content written to board.json. */
export type BoardContent = {
  syncedAt: string;
  sections: BoardSections;
};

/** @deprecated Use BoardTicket */
export type JiraSkillTicket = BoardTicket;

/** @deprecated Use BoardSection */
export type JiraSkillSection = BoardSection;

/** @deprecated Use BoardSections */
export type JiraTicketsSkillContent = {
  name: string;
  description: string;
  sections: BoardSections;
};

/** Board sync exit status with optional error message. */
export type SyncResult = {
  code: number;
  error?: string;
  summary?: SyncSummary;
};

/** Structured sync summary for human and JSON output. */
export type SyncSummary = {
  boardId: string | null;
  sprintIds: number[];
  issueCount: number;
  counts: Record<Folder, number>;
  boardPath: string;
};

/** One diagnostic check from jira doctor. */
export type DoctorCheck = {
  name: string;
  ok: boolean;
  message: string;
  fix?: string;
};
