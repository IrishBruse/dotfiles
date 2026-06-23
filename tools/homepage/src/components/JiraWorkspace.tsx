import { useEffect, useMemo, useRef, useState } from "react";

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
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(
    initialTickets[0]?.key ?? null
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const selectedRowRef = useRef<HTMLButtonElement>(null);

  const filtered = useMemo(
    () => filterTickets(initialTickets, query),
    [query]
  );
  const groups = useMemo(() => groupFilteredTickets(filtered), [filtered]);
  const flat = useMemo(() => flattenTickets(groups), [groups]);

  useEffect(() => {
    if (flat.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !flat.some((ticket) => ticket.key === selectedKey)) {
      setSelectedKey(flat[0]!.key);
    }
  }, [flat, selectedKey]);

  function moveSelection(delta: number): void {
    if (flat.length === 0) {
      return;
    }
    const index = flat.findIndex((ticket) => ticket.key === selectedKey);
    const next =
      index < 0
        ? 0
        : Math.min(flat.length - 1, Math.max(0, index + delta));
    setSelectedKey(flat[next]!.key);
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
          onSelect={setSelectedKey}
        />
        <TicketDetail ticket={selected} />
      </div>
    </section>
  );
}
