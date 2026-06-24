import { Fragment, type RefObject } from "react";

import type { AssigneeGroup, StatusGroup } from "../jira/types.ts";

type Props = {
  statusGroups: StatusGroup[];
  assigneeGroups: AssigneeGroup[];
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

function TicketRow({
  ticket,
  active,
  selectedRowRef,
  onSelect
}: {
  ticket: StatusGroup["tickets"][number];
  active: boolean;
  selectedRowRef?: RefObject<HTMLButtonElement | null>;
  onSelect: (key: string) => void;
}) {
  return (
    <li>
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
}

export default function TicketList({
  statusGroups,
  assigneeGroups,
  selectedKey,
  selectedRowRef,
  onSelect
}: Props) {
  return (
    <div className="jira-list">
      {statusGroups.map((group) => (
        <section key={group.statusBucket} className="jira-list-group">
          <h2 className="jira-list-heading">{group.status.toUpperCase()}</h2>
          <ul className="jira-list-rows">
            {group.tickets.map((ticket) => (
              <TicketRow
                key={ticket.key}
                ticket={ticket}
                active={ticket.key === selectedKey}
                selectedRowRef={selectedRowRef}
                onSelect={onSelect}
              />
            ))}
          </ul>
        </section>
      ))}
      {assigneeGroups.length > 0 && (
        <section className="jira-list-other" aria-label="Team tickets">
          <ul className="jira-list-rows jira-list-rows-dense">
            {assigneeGroups.map((group) => (
              <Fragment key={group.assignee}>
                <li className="jira-list-assignee-heading" aria-hidden="true">
                  {group.assignee}
                </li>
                {group.tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.key}
                    ticket={ticket}
                    active={ticket.key === selectedKey}
                    selectedRowRef={selectedRowRef}
                    onSelect={onSelect}
                  />
                ))}
              </Fragment>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
