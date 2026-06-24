import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import boardData from "virtual:jira-board";

import { flattenTickets, groupTickets } from "../jira/board.ts";
import type { BoardTicket } from "../jira/types.ts";

const PREVIEW_LIMIT = 5;
const seedTickets = (boardData as { tickets: BoardTicket[] }).tickets;

function statusDot(bucket: string): string {
  switch (bucket) {
    case "inProgress":
      return "dot-in-progress";
    case "codeReview":
      return "dot-code-review";
    case "inTest":
      return "dot-in-test";
    case "done":
      return "dot-done";
    default:
      return "dot-todo";
  }
}

export default function JiraWidget() {
  const [tickets, setTickets] = useState(seedTickets);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const preview = useMemo(
    () => flattenTickets(groupTickets(tickets)).slice(0, PREVIEW_LIMIT),
    [tickets]
  );

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/jira/sync", { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        tickets?: BoardTicket[];
      };
      if (!res.ok || !data.ok || !data.tickets) {
        setSyncError(data.error ?? "Sync failed");
        return;
      }
      setTickets(data.tickets);
    } catch {
      setSyncError("Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <aside className="dashboard-jira-widget" aria-label="Jira preview">
      <header className="dashboard-jira-widget-header">
        <Link className="dashboard-jira-widget-title" to="/jira">
          Jira
        </Link>
        <button
          type="button"
          className="dashboard-jira-widget-action"
          onClick={handleSync}
          disabled={syncing}
          aria-label="Sync Jira"
          title="jira sync"
        >
          {syncing ? "..." : "Sync"}
        </button>
      </header>
      {syncError && (
        <p className="dashboard-jira-widget-error" role="status">
          {syncError}
        </p>
      )}
      {preview.length > 0 && (
        <ul className="jira-list-rows">
          {preview.map((ticket) => (
            <li key={ticket.key}>
              <Link
                className="jira-list-row"
                to={`/jira?ticket=${ticket.key}`}
              >
                <span
                  className={`jira-status-dot ${statusDot(ticket.statusBucket)}`}
                  aria-hidden="true"
                />
                <span className="jira-list-key">{ticket.key}</span>
                <span className="jira-list-summary">{ticket.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
