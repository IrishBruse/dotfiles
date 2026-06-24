import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import boardData from "virtual:jira-board";

import {
  filterTickets,
  flattenTickets,
  groupFilteredTickets
} from "../jira/board.ts";
import { useJiraKeyboard } from "../jira/useJiraKeyboard.ts";
import type { BoardTicket } from "../jira/types.ts";
import SearchBar from "./SearchBar.tsx";
import TicketDetail from "./TicketDetail.tsx";
import TicketList from "./TicketList.tsx";

const initialTickets = (boardData as { tickets: BoardTicket[] }).tickets;

export default function JiraWorkspace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketParam = searchParams.get("ticket");
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRowRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(
    () => filterTickets(initialTickets, query),
    [query]
  );
  const groups = useMemo(() => groupFilteredTickets(filtered), [filtered]);
  const flat = useMemo(() => flattenTickets(groups), [groups]);

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
        setSearchParams({}, { replace: true });
      }
      return;
    }
    if (selectedKey !== ticketParam) {
      setSearchParams({ ticket: selectedKey }, { replace: true });
    }
  }, [selectedKey, setSearchParams, ticketParam]);

  function selectKey(key: string): void {
    setSearchParams({ ticket: key }, { replace: true });
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
    searchRef,
    selectedRowRef,
    searchQuery: query,
    onClearSearch: () => setQuery("")
  });

  const selected =
    flat.find((ticket) => ticket.key === selectedKey) ?? null;

  return (
    <section className="jira-workspace" aria-label="Jira workspace">
      <SearchBar
        ref={searchRef}
        value={query}
        onChange={setQuery}
      />
      <div className="jira-panes">
        <TicketList
          groups={groups}
          selectedKey={selectedKey}
          selectedRowRef={selectedRowRef}
          onSelect={selectKey}
        />
        <TicketDetail ticket={selected} />
      </div>
    </section>
  );
}
