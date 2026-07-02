import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

import boardData from "virtual:jira-board";

import { useCommandPalette } from "../command-palette/CommandPaletteContext.tsx";
import { filterTickets } from "../jira/board.ts";
import type { BoardData, BoardTicket } from "../jira/types.ts";

const board = boardData as BoardData;
const tickets = [...board.myTickets, ...board.otherTickets];
const RESULT_LIMIT = 8;

const NAV_ITEMS = [
  { label: "Home", path: "/" },
  { label: "Jira board", path: "/jira" },
  { label: "GitHub versions", path: "/versions" }
] as const;

type PaletteRow =
  | { kind: "nav"; label: string; path: string }
  | { kind: "jira"; ticket: BoardTicket };

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

function modKeyLabel(): string {
  return navigator.platform.includes("Mac") ? "Cmd" : "Ctrl";
}

export default function CommandPalette() {
  const { query, setQuery, inputRef } = useCommandPalette();
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLUListElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const onJira = location.pathname === "/jira";
  const trimmed = query.trim();
  const showDropdown = !onJira && focused;

  const rows = useMemo((): PaletteRow[] => {
    if (!showDropdown) {
      return [];
    }
    if (!trimmed) {
      return NAV_ITEMS.map((item) => ({ kind: "nav", ...item }));
    }
    return filterTickets(tickets, trimmed)
      .slice(0, RESULT_LIMIT)
      .map((ticket) => ({ kind: "jira" as const, ticket }));
  }, [showDropdown, trimmed]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [trimmed, showDropdown]);

  useEffect(() => {
    if (activeIndex < 0) {
      return;
    }
    const row = listRef.current?.children[activeIndex];
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function runRow(row: PaletteRow): void {
    if (row.kind === "nav") {
      navigate(row.path);
      inputRef.current?.blur();
      return;
    }
    navigate(`/jira?ticket=${row.ticket.key}`);
    inputRef.current?.blur();
  }

  function runActiveOrSubmit(event?: FormEvent): void {
    event?.preventDefault();
    if (onJira) {
      return;
    }
    if (activeIndex >= 0 && rows[activeIndex]) {
      runRow(rows[activeIndex]!);
      return;
    }
    if (!trimmed) {
      return;
    }
    navigate("/jira");
    inputRef.current?.blur();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      setQuery("");
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (!showDropdown || rows.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(rows.length - 1, index + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(-1, index - 1));
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      runRow(rows[activeIndex]!);
    }
  }

  return (
    <header className="command-palette-topbar">
      <Link
        to="/"
        className="command-palette-home"
        aria-label="Home"
        title="Home"
      >
        <img src="/favicon.svg" alt="" className="command-palette-home-icon" />
      </Link>
      <div
        className={`command-palette-shell${showDropdown ? " is-open" : ""}`}
      >
        <form className="command-palette-form" onSubmit={runActiveOrSubmit}>
          <img
            src="/search.svg"
            alt=""
            className="command-palette-search-icon"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={onInputKeyDown}
            placeholder={
              onJira ? "Search or Filter..." : "Search dashboard..."
            }
            aria-label="Search dashboard"
            aria-expanded={showDropdown}
            aria-controls={
              showDropdown ? "command-palette-results" : undefined
            }
            aria-activedescendant={
              activeIndex >= 0
                ? `command-palette-option-${activeIndex}`
                : undefined
            }
            autoComplete="off"
            role="combobox"
          />
          <kbd className="command-palette-kbd">{modKeyLabel()} K</kbd>
        </form>
        {showDropdown && (
          <div
            id="command-palette-results"
            className="command-palette-dropdown"
            role="listbox"
            aria-label="Command palette results"
            onMouseDown={(event) => event.preventDefault()}
          >
            {rows.length > 0 ? (
              <ul ref={listRef} className="command-palette-results-list">
                {rows.map((row, index) => {
                  const active = index === activeIndex;
                  if (row.kind === "nav") {
                    return (
                      <li key={row.path} role="presentation">
                        <button
                          id={`command-palette-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={`command-palette-row${
                            active ? " is-active" : ""
                          }`}
                          onClick={() => runRow(row)}
                          onMouseEnter={() => setActiveIndex(index)}
                        >
                          <span className="command-palette-row-kind">Go</span>
                          <span className="command-palette-row-label">
                            {row.label}
                          </span>
                        </button>
                      </li>
                    );
                  }
                  return (
                    <li key={row.ticket.key} role="presentation">
                      <button
                        id={`command-palette-option-${index}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={`command-palette-row jira-list-row${
                          active ? " is-active" : ""
                        }`}
                        onClick={() => runRow(row)}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <span
                          className={`jira-status-dot ${statusDot(row.ticket.statusBucket)}`}
                          aria-hidden="true"
                        />
                        <span className="jira-list-key">{row.ticket.key}</span>
                        <span className="jira-list-summary">
                          {row.ticket.summary}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="command-palette-empty">No matches</p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
