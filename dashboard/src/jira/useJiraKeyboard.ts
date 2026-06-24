import { useEffect, type RefObject } from "react";
import { useNavigate } from "react-router-dom";

import { useCommandPalette } from "../command-palette/CommandPaletteContext.tsx";
import type { BoardTicket } from "../jira/types.ts";
import {
  branchName,
  commitPrefix,
  copyText,
  markdownLink
} from "../jira/format.ts";

type Options = {
  tickets: BoardTicket[];
  selectedKey: string | null;
  onMove: (delta: number) => void;
  selectedRowRef: RefObject<HTMLButtonElement | null>;
};

export function useJiraKeyboard({
  tickets,
  selectedKey,
  onMove,
  selectedRowRef
}: Options): void {
  const navigate = useNavigate();
  const { inputRef, query, setQuery, focusSearch } = useCommandPalette();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const inSearch =
        target instanceof HTMLInputElement && target.type === "search";

      if (event.key === "/" && !inSearch) {
        event.preventDefault();
        setQuery("");
        focusSearch();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        if (inSearch && query) {
          setQuery("");
          inputRef.current?.blur();
          return;
        }
        navigate("/");
        return;
      }

      if (inSearch) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          inputRef.current?.blur();
          selectedRowRef.current?.focus();
        }
        return;
      }

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        onMove(1);
        return;
      }

      if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        onMove(-1);
        return;
      }

      const ticket = tickets.find((row) => row.key === selectedKey);
      if (!ticket) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        window.open(ticket.url, "_blank", "noopener,noreferrer");
        return;
      }

      if (event.key === "b" || event.key === "B") {
        event.preventDefault();
        void copyText(branchName(ticket));
        return;
      }

      if (event.key === "c" || event.key === "C") {
        event.preventDefault();
        void copyText(commitPrefix(ticket));
        return;
      }

      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        void copyText(markdownLink(ticket));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    focusSearch,
    inputRef,
    navigate,
    onMove,
    query,
    selectedRowRef,
    selectedKey,
    setQuery,
    tickets
  ]);
}
