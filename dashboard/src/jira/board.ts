import type { BoardTicket, StatusGroup } from "./types.ts";

const GROUP_ORDER = [
  "inProgress",
  "codeReview",
  "inTest",
  "todo",
  "done"
] as const;

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
