import type { AssigneeGroup, BoardData, BoardTicket, StatusGroup } from "./types.ts";

const GROUP_ORDER = [
  "inProgress",
  "codeReview",
  "inTest",
  "todo",
  "done"
] as const;

const STATUS_RANK = new Map<string, number>(
  GROUP_ORDER.map((bucket, index) => [bucket, index])
);

export function allBoardTickets(data: BoardData): BoardTicket[] {
  return [...data.myTickets, ...data.otherTickets];
}

export function groupTickets(tickets: BoardTicket[]): StatusGroup[] {
  const groups = new Map<string, StatusGroup>();

  for (const ticket of tickets) {
    const existing = groups.get(ticket.statusBucket);
    if (existing) {
      existing.tickets.push(ticket);
      continue;
    }
    groups.set(ticket.statusBucket, {
      status: ticket.status,
      statusBucket: ticket.statusBucket,
      tickets: [ticket]
    });
  }

  return GROUP_ORDER.flatMap((bucket) => {
    const group = groups.get(bucket);
    return group ? [group] : [];
  });
}

export function flattenTickets(groups: StatusGroup[]): BoardTicket[] {
  return groups.flatMap((group) => group.tickets);
}

export function filterTickets(
  tickets: BoardTicket[],
  query: string
): BoardTicket[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return tickets;
  }
  return tickets.filter((ticket) => {
    const haystack = [
      ticket.key,
      ticket.summary,
      ticket.description,
      ticket.status
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export function groupFilteredTickets(tickets: BoardTicket[]): StatusGroup[] {
  return groupTickets(tickets);
}

function assigneeSortKey(name: string, other: string): number {
  if (name === "Unassigned") {
    return other === "Unassigned" ? 0 : 1;
  }
  if (other === "Unassigned") {
    return -1;
  }
  return name.localeCompare(other);
}

function sortByStatus(tickets: BoardTicket[]): BoardTicket[] {
  return [...tickets].sort(
    (left, right) =>
      (STATUS_RANK.get(left.statusBucket) ?? 99) -
      (STATUS_RANK.get(right.statusBucket) ?? 99)
  );
}

export function groupByAssignee(tickets: BoardTicket[]): AssigneeGroup[] {
  const groups = new Map<string, BoardTicket[]>();

  for (const ticket of tickets) {
    const existing = groups.get(ticket.assignee);
    if (existing) {
      existing.push(ticket);
      continue;
    }
    groups.set(ticket.assignee, [ticket]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => assigneeSortKey(left, right))
    .map(([assignee, rows]) => ({
      assignee,
      tickets: sortByStatus(rows)
    }));
}

export function flattenAssigneeGroups(groups: AssigneeGroup[]): BoardTicket[] {
  return groups.flatMap((group) => group.tickets);
}
