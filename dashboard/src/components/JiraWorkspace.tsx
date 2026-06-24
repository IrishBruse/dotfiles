import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import boardData from "virtual:jira-board";

import { useCommandPalette } from "../command-palette/CommandPaletteContext.tsx";
import {
  filterTickets,
  flattenAssigneeGroups,
  flattenTickets,
  groupByAssignee,
  groupFilteredTickets
} from "../jira/board.ts";
import { useJiraKeyboard } from "../jira/useJiraKeyboard.ts";
import type { BoardData } from "../jira/types.ts";
import TicketDetail from "./TicketDetail.tsx";
import TicketList from "./TicketList.tsx";

const board = boardData as BoardData;

export default function JiraWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");
  const { query } = useCommandPalette();
  const selectedRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!searchParams.has("q")) {
      return;
    }
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.delete("q");
        return next;
      },
      { replace: true }
    );
  }, [searchParams, setSearchParams]);

  const filteredMy = useMemo(
    () => filterTickets(board.myTickets, query),
    [query]
  );
  const filteredOther = useMemo(
    () => filterTickets(board.otherTickets, query),
    [query]
  );
  const statusGroups = useMemo(
    () => groupFilteredTickets(filteredMy),
    [filteredMy]
  );
  const assigneeGroups = useMemo(
    () => groupByAssignee(filteredOther),
    [filteredOther]
  );
  const flat = useMemo(
    () => [
      ...flattenTickets(statusGroups),
      ...flattenAssigneeGroups(assigneeGroups)
    ],
    [statusGroups, assigneeGroups]
  );

  const selectedKey = useMemo(() => {
    if (flat.length === 0) {
      return null;
    }
    if (ticketParam && flat.some((ticket) => ticket.key === ticketParam)) {
      return ticketParam;
    }
    return flat[0]!.key;
  }, [flat, ticketParam]);

  useEffect(() => {
    if (!selectedKey) {
      if (ticketParam) {
        setSearchParams(
          (params) => {
            const next = new URLSearchParams(params);
            next.delete("ticket");
            return next;
          },
          { replace: true }
        );
      }
      return;
    }
    if (selectedKey !== ticketParam) {
      setSearchParams(
        (params) => {
          const next = new URLSearchParams(params);
          next.set("ticket", selectedKey);
          return next;
        },
        { replace: true }
      );
    }
  }, [selectedKey, setSearchParams, ticketParam]);

  function selectKey(key: string): void {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.set("ticket", key);
        return next;
      },
      { replace: true }
    );
  }

  function moveSelection(delta: number): void {
    if (flat.length === 0) {
      return;
    }
    const index = flat.findIndex((ticket) => ticket.key === selectedKey);
    const next =
      index < 0
        ? 0
        : Math.min(flat.length - 1, Math.max(0, index + delta));
    selectKey(flat[next]!.key);
  }

  useJiraKeyboard({
    tickets: flat,
    selectedKey,
    onMove: moveSelection,
    selectedRowRef
  });

  const selected =
    flat.find((ticket) => ticket.key === selectedKey) ?? null;

  return (
    <section className="jira-workspace" aria-label="Jira workspace">
      <div className="jira-panes">
        <TicketList
          statusGroups={statusGroups}
          assigneeGroups={assigneeGroups}
          selectedKey={selectedKey}
          selectedRowRef={selectedRowRef}
          onSelect={selectKey}
        />
        <TicketDetail ticket={selected} />
      </div>
    </section>
  );
}
