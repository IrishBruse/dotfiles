import type { BoardTicket } from "../jira/types.ts";
import { copyText, relativeCreated, relativeUpdated } from "../jira/format.ts";
import TicketMarkdown from "./TicketMarkdown.tsx";

type Props = {
  ticket: BoardTicket | null;
};

export default function TicketDetail({ ticket }: Props) {
  if (!ticket) {
    return (
      <div className="jira-detail jira-detail-empty">
        <p>Select a ticket</p>
      </div>
    );
  }

  const doneCount = ticket.subtasks.filter((item) => item.done).length;
  const subtaskLabel =
    ticket.subtasks.length > 0
      ? `Subtasks (${doneCount}/${ticket.subtasks.length})`
      : null;

  return (
    <div className="jira-detail">
      <header className="jira-detail-header">
        <dl className="jira-detail-meta">
          <div>
            <dt>Assignee</dt>
            <dd>{ticket.assignee}</dd>
          </div>
          <div>
            <dt>Priority</dt>
            <dd>{ticket.priority}</dd>
          </div>
          {ticket.createdAt ? (
            <div>
              <dt>Created</dt>
              <dd>{relativeCreated(ticket.createdAt)}</dd>
            </div>
          ) : null}
          {ticket.updatedAt ? (
            <div>
              <dt>Updated</dt>
              <dd>{relativeUpdated(ticket.updatedAt)}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <div className="jira-detail-body">
        <section className="jira-detail-section">
          <h2>Description</h2>
          <TicketMarkdown source={ticket.description} />
        </section>

        {subtaskLabel ? (
          <section className="jira-detail-section">
            <h2>{subtaskLabel}</h2>
            <ul className="jira-subtasks">
              {ticket.subtasks.map((item) => (
                <li key={item.summary} className={item.done ? "is-done" : ""}>
                  <span className="jira-subtask-box" aria-hidden="true">
                    {item.done ? "x" : ""}
                  </span>
                  {item.summary}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className="jira-detail-dock">
        <button
          type="button"
          className="jira-detail-dock-action"
          onClick={() =>
            window.open(ticket.url, "_blank", "noopener,noreferrer")
          }
        >
          [O] Open
        </button>
        <button
          type="button"
          className="jira-detail-dock-action"
          onClick={() => void copyText(ticket.url)}
        >
          [C] Copy link
        </button>
      </footer>
    </div>
  );
}
