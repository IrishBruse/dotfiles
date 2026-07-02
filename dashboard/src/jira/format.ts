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

function relativeTime(label: "Created" | "Updated", iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) {
    return `${label} just now`;
  }
  if (minutes < 60) {
    return `${label} ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${label} ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${label} ${days} day${days === 1 ? "" : "s"} ago`;
}

export function relativeCreated(iso: string): string {
  return relativeTime("Created", iso);
}

export function relativeUpdated(iso: string): string {
  return relativeTime("Updated", iso);
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
