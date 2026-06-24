import type { RefObject } from "react";

import type { StatusGroup } from "../jira/types.ts";

type Props = {
  groups: StatusGroup[];
  selectedKey: string | null;
  selectedRowRef?: RefObject<HTMLButtonElement | null>;
  onSelect: (key: string) => void;
};

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

export default function TicketList({
  groups,
  selectedKey,
  selectedRowRef,
  onSelect
}: Props) {
  return (
    <div className="jira-list">
      {groups.map((group) => (
        <section key={group.statusBucket} className="jira-list-group">
          <h2 className="jira-list-heading">{group.status.toUpperCase()}</h2>
          <ul className="jira-list-rows">
            {group.tickets.map((ticket) => {
              const active = ticket.key === selectedKey;
              return (
                <li key={ticket.key}>
                  <button
                    ref={active ? selectedRowRef : undefined}
                    type="button"
                    className={`jira-list-row${active ? " is-active" : ""}`}
                    onClick={() => onSelect(ticket.key)}
                  >
                    <span
                      className={`jira-status-dot ${statusDot(ticket.statusBucket)}`}
                      aria-hidden="true"
                    />
                    <span className="jira-list-key">{ticket.key}</span>
                    <span className="jira-list-summary">{ticket.summary}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
