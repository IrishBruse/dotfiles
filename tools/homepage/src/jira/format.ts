import type { BoardTicket } from "./types.ts";

function slugify(summary: string): string {
  return summary
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function branchName(ticket: BoardTicket): string {
  return `feature/${ticket.key}-${slugify(ticket.summary)}`;
}

export function commitPrefix(ticket: BoardTicket): string {
  return `feat(${ticket.key}): ${ticket.summary}`;
}

export function markdownLink(ticket: BoardTicket): string {
  return `[${ticket.key}: ${ticket.summary}](${ticket.url})`;
}

export function relativeUpdated(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) {
    return "Updated just now";
  }
  if (minutes < 60) {
    return `Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `Updated ${days} day${days === 1 ? "" : "s"} ago`;
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
