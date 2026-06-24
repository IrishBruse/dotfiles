export type BoardSubtask = {
  summary: string;
  done: boolean;
};

export type BoardTicket = {
  key: string;
  summary: string;
  assignee: string;
  status: string;
  statusBucket: string;
  priority: string;
  updatedAt: string;
  url: string;
  description: string;
  subtasks: BoardSubtask[];
};

export type BoardData = {
  tickets: BoardTicket[];
};

export type StatusGroup = {
  status: string;
  statusBucket: string;
  tickets: BoardTicket[];
};
