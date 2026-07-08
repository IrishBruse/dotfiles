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
