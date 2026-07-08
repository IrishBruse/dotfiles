import process from "node:process";
import {
  paint,
  stderrColorEnabled,
  stdoutColorEnabled
} from "../../dotfiles/api.ts";

import type { PageStatus } from "./page-state.ts";

export function printError(msg: string): void {
  const c = stderrColorEnabled();
  process.stderr.write(`${paint(c, "bad", "error")}: ${msg}\n`);
}

export function printPulled(
  pageId: string,
  title: string,
  relPath: string
): void {
  const c = stdoutColorEnabled();
  process.stdout.write(
    `${paint(c, "label", pageId)}  ${title}\n${paint(c, "dim", "  -> ")}${relPath}\n`
  );
}

export function printPullSummary(total: number): void {
  const c = stdoutColorEnabled();
  const noun = total === 1 ? "page" : "pages";
  process.stdout.write(`\n${paint(c, "ok", `Pulled ${total} ${noun}.`)}\n`);
}

export function printStatusLine(
  state: PageStatus,
  pageId: string,
  title: string,
  relPath: string
): void {
  const c = stdoutColorEnabled();
  const role = state === "clean" ? "ok" : state === "behind" ? "warn" : "bad";
  process.stdout.write(
    `${paint(c, role, state.padEnd(8))} ${paint(c, "label", pageId)}  ${title}\n${paint(c, "dim", "         ")}${relPath}\n`
  );
}
