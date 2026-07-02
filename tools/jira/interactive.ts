import { spawn } from "node:child_process";
import readline from "node:readline";
import process from "node:process";

import { markdown } from "../markdown/api.ts";
import { listLocalTickets, type LocalTicket } from "./local.ts";
import { pullAll, pullTicket } from "./pull.ts";
import { pushAll, pushTicket } from "./push.ts";

const ESC = "\u001B";
const ENTER_ALT = `${ESC}[?1049h`;
const LEAVE_ALT = `${ESC}[?1049l`;
const HOME = `${ESC}[H`;
const CLR_EOS = `${ESC}[J`;
const HIDE_CURSOR = `${ESC}[?25l`;
const SHOW_CURSOR = `${ESC}[?25h`;
const ESCAPE_CODE_TIMEOUT_MS = 25;

const HELP =
  "Up/Down: move  Enter: view  u: pull  a: pull all  s: push  g: push all  o: open  q: quit";

type TicketSection = {
  title: string;
  tickets: LocalTicket[];
};

type TicketRow = {
  section: TicketSection;
  ticket: LocalTicket;
};

function stdoutColor(): boolean {
  return process.stdout.isTTY === true;
}

function paint(enabled: boolean, code: string, text: string): string {
  if (!enabled || text === "") return text;
  return `${code}${text}\x1b[0m`;
}

function enableKeypress(stdin: NodeJS.ReadStream): readline.Interface {
  const rl = readline.createInterface({
    input: stdin,
    escapeCodeTimeout: ESCAPE_CODE_TIMEOUT_MS
  });
  readline.emitKeypressEvents(stdin, rl);
  return rl;
}

function groupTickets(tickets: LocalTicket[]): TicketSection[] {
  const byType = new Map<string, LocalTicket[]>();
  for (const ticket of tickets) {
    const list = byType.get(ticket.typeDir) ?? [];
    list.push(ticket);
    byType.set(ticket.typeDir, list);
  }
  return [...byType.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    .map(([title, sectionTickets]) => ({ title, tickets: sectionTickets }));
}

function flattenSections(sections: TicketSection[]): TicketRow[] {
  const rows: TicketRow[] = [];
  for (const section of sections) {
    for (const ticket of section.tickets) {
      rows.push({ section, ticket });
    }
  }
  return rows;
}

function formatRow(ticket: LocalTicket, selected: boolean, color: boolean): string {
  const prefix = selected ? paint(color, "\x1b[36m", "> ") : "  ";
  const key = paint(color, "\x1b[1m", ticket.key);
  const title = ticket.title;
  const meta = paint(
    color,
    "\x1b[2m",
    `  ${ticket.issueType}  ${ticket.status}`
  );
  return `${prefix}${key}  ${title}${meta}`;
}

function buildListLines(
  sections: TicketSection[],
  selected: number,
  color: boolean,
  cwd: string
): string[] {
  const lines = [
    paint(color, "\x1b[1m", `Jira tickets (${cwd}/jira)`),
    ""
  ];
  let rowIndex = 0;

  if (sections.length === 0) {
    lines.push(paint(color, "\x1b[2m", "  (no tickets — run jira <KEY> to pull one)"));
    lines.push("");
    return lines;
  }

  for (const section of sections) {
    lines.push(paint(color, "\x1b[1m", section.title));
    for (const ticket of section.tickets) {
      lines.push(formatRow(ticket, rowIndex === selected, color));
      rowIndex++;
    }
    lines.push("");
  }
  return lines;
}

function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    stdin.resume();
    const onKeypress = (): void => {
      stdin.removeListener("keypress", onKeypress);
      resolve();
    };
    stdin.on("keypress", onKeypress);
  });
}

async function showDetails(ticket: LocalTicket): Promise<void> {
  const stdin = process.stdin;
  const stdout = process.stdout;

  stdin.setRawMode(false);
  stdout.write(SHOW_CURSOR + LEAVE_ALT + HOME + CLR_EOS);
  stdout.write(
    markdown(`# ${ticket.key}: ${ticket.title}\n\n${ticket.description || "_(no description)_"}`)
  );
  stdout.write(
    `\n\n${paint(stdoutColor(), "\x1b[2m", `${ticket.url}\nPress any key to return...`)}\n`
  );
  await waitForKeypress();
  stdin.setRawMode(true);
  stdout.write(ENTER_ALT + HIDE_CURSOR + HOME + CLR_EOS);
}

function openInBrowser(url: string): void {
  const platform = process.platform;
  const cmd = platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
}

/** Interactive browser for the local `jira/` folder. */
export async function runJiraInteractive(): Promise<number> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write("jira: interactive mode requires a terminal\n");
    return 1;
  }

  const cwd = process.cwd();
  let tickets = listLocalTickets(cwd);
  let sections = groupTickets(tickets);
  let rows = flattenSections(sections);

  const stdin = process.stdin;
  const stdout = process.stdout;
  const color = stdoutColor();
  let selected = 0;
  let busy = false;
  let statusLine = "";

  const reload = (): void => {
    tickets = listLocalTickets(cwd);
    sections = groupTickets(tickets);
    rows = flattenSections(sections);
    if (rows.length === 0) {
      selected = 0;
      return;
    }
    selected = Math.min(selected, rows.length - 1);
  };

  const draw = (): void => {
    const lines = [
      ...buildListLines(sections, selected, color, cwd),
      statusLine ? paint(color, "\x1b[33m", statusLine) : "",
      paint(color, "\x1b[2m", HELP)
    ].filter((line, index, all) => !(line === "" && all[index + 1] === ""));
    stdout.write(HOME + CLR_EOS + lines.join("\n"));
  };

  const runAction = async (
    label: string,
    action: () => number | Promise<number>
  ): Promise<void> => {
    busy = true;
    statusLine = `${label}…`;
    draw();
    const code = await action();
    reload();
    statusLine =
      code === 0 ? `${label} done` : `${label} failed (see stderr)`;
    busy = false;
    draw();
  };

  stdin.setRawMode(true);
  stdin.resume();
  stdout.write(ENTER_ALT + HIDE_CURSOR);
  draw();

  const rl = enableKeypress(stdin);

  return await new Promise<number>((resolve) => {
    const cleanup = (code: number): void => {
      stdin.removeListener("keypress", onKeypress);
      rl.close();
      stdin.setRawMode(false);
      stdout.write(SHOW_CURSOR + LEAVE_ALT + HOME + CLR_EOS);
      resolve(code);
    };

    const onKeypress = async (
      str: string,
      key: readline.Key | undefined
    ): Promise<void> => {
      if (busy) return;

      if (key?.name === "escape" || str === "q" || (key?.ctrl && key.name === "c")) {
        cleanup(0);
        return;
      }

      if (rows.length === 0) {
        if (key?.name === "escape" || str === "q") cleanup(0);
        return;
      }

      const row = rows[selected];
      if (!row) return;

      if (key?.name === "up" || str === "k") {
        selected = selected <= 0 ? rows.length - 1 : selected - 1;
        statusLine = "";
        draw();
        return;
      }
      if (key?.name === "down" || str === "j") {
        selected = selected >= rows.length - 1 ? 0 : selected + 1;
        statusLine = "";
        draw();
        return;
      }
      if (key?.name === "return") {
        busy = true;
        draw();
        await showDetails(row.ticket);
        busy = false;
        draw();
        return;
      }
      if (str === "o") {
        openInBrowser(row.ticket.url);
        statusLine = `Opened ${row.ticket.key}`;
        draw();
        return;
      }
      if (str === "u") {
        await runAction(`Pulled ${row.ticket.key}`, () =>
          pullTicket(row.ticket.key, { cwd, quiet: true })
        );
        return;
      }
      if (str === "a") {
        await runAction("Pulled all", () => pullAll(cwd, { quiet: true }));
        return;
      }
      if (str === "s") {
        await runAction(`Pushed ${row.ticket.key}`, () =>
          pushTicket(row.ticket.key, cwd, { quiet: true })
        );
        return;
      }
      if (str === "g") {
        await runAction("Pushed all", () => pushAll(cwd, { quiet: true }));
        return;
      }
    };

    stdin.on("keypress", (str, key) => {
      void onKeypress(str, key);
    });
  });
}
