import path from "node:path";
import process from "node:process";

import { normalizePrRef, requireGhPr } from "./gh.ts";
import { readState } from "./state.ts";
import type { Parsed } from "./types.ts";
import { usage } from "./usage.ts";

/** First-pass review only (`pr review`). */
function isReviewCmd(sub: string): boolean {
  return sub === "review";
}

/** Create PR from branch (`pr open` and aliases `add` / `new` / `create`). */
function isPrCreateCmd(sub: string): boolean {
  return sub === "open" || sub === "add" || sub === "new" || sub === "create";
}

function explicitReviewModeFromSub(sub: string): "add" | "update" | null {
  if (sub === "update") return "update";
  if (isReviewCmd(sub)) return "add";
  return null;
}

function parseMainAndForward(argv: string[]): {
  main: string[];
  agentForward: string[];
} {
  const dd = argv.indexOf("--");
  if (dd === -1) return { main: argv, agentForward: [] };
  return { main: argv.slice(0, dd), agentForward: argv.slice(dd + 1) };
}

function parseFlags(main: string[]): {
  workspace: string;
  print: boolean;
  positional: string[];
} {
  let workspace = process.cwd();
  let print = false;
  const positional: string[] = [];

  for (let i = 0; i < main.length; i++) {
    const a = main[i];
    if (a === "-h" || a === "--help") usage();
    if (a === "-p" || a === "--print") {
      print = true;
      continue;
    }
    if (a === "-w" || a === "--workspace") {
      const v = main[++i];
      if (!v) usage();
      workspace = path.resolve(v);
      continue;
    }
    if (a.startsWith("-")) {
      process.stderr.write(`pr: unknown option ${a}\n`);
      usage();
    }
    positional.push(a);
  }

  return { workspace, print, positional };
}

export function parseArgs(argv: string[]): Parsed {
  if (argv.length === 0) {
    return {
      mode: "add",
      pr: null,
      ticket: null,
      workspace: process.cwd(),
      print: false,
      agentForward: [],
      hint: null,
      stateKey: null,
      headOid: null,
      autoPicked: true,
    };
  }
  if (argv[0] === "-h" || argv[0] === "--help") usage();

  const { main, agentForward } = parseMainAndForward(argv);
  const sub = main[0];

  if (isPrCreateCmd(sub)) {
    const { workspace, print, positional } = parseFlags(main.slice(1));
    if (positional.length > 1) {
      process.stderr.write(
        `pr: ${sub}: at most one optional Jira key (e.g. NOVACORE-123)\n`,
      );
      usage();
    }
    const ticket = positional[0]?.trim() ?? null;
    return {
      mode: "open",
      pr: null,
      ticket,
      workspace,
      print,
      agentForward,
      hint: null,
      stateKey: null,
      headOid: null,
      autoPicked: false,
    };
  }

  const explicitMode = explicitReviewModeFromSub(sub);
  if (explicitMode !== null) {
    const { workspace, print, positional } = parseFlags(main.slice(1));
    if (positional.length > 1) {
      process.stderr.write("pr: too many arguments (PR is a single token)\n");
      usage();
    }
    const pr = positional[0] != null ? normalizePrRef(positional[0]) : null;
    const gh = pr ? requireGhPr(workspace, pr) : null;
    return {
      mode: explicitMode,
      pr,
      ticket: null,
      workspace,
      print,
      agentForward,
      hint: null,
      stateKey: gh?.key ?? null,
      headOid: gh?.headOid ?? null,
      autoPicked: false,
    };
  }

  const { workspace, print, positional } = parseFlags(main);
  if (positional.length > 1) {
    process.stderr.write("pr: too many arguments (PR is a single token)\n");
    usage();
  }
  const pr = positional[0] != null ? normalizePrRef(positional[0]) : null;

  if (!pr) {
    return {
      mode: "add",
      pr: null,
      ticket: null,
      workspace,
      print,
      agentForward,
      hint: null,
      stateKey: null,
      headOid: null,
      autoPicked: true,
    };
  }

  const gh = requireGhPr(workspace, pr);

  const store = readState();
  const prev = store[gh.key];
  if (prev === undefined) {
    process.stderr.write(
      `pr: first run for ${gh.key} — initial review (add)\n`,
    );
    return {
      mode: "add",
      pr,
      ticket: null,
      workspace,
      print,
      agentForward,
      hint: null,
      stateKey: gh.key,
      headOid: gh.headOid,
      autoPicked: true,
    };
  }
  if (prev !== gh.headOid) {
    process.stderr.write(
      `pr: new commits on ${gh.key} — follow-up review (update)\n`,
    );
    return {
      mode: "update",
      pr,
      ticket: null,
      workspace,
      print,
      agentForward,
      hint: null,
      stateKey: gh.key,
      headOid: gh.headOid,
      autoPicked: true,
    };
  }

  process.stderr.write(
    `pr: same HEAD as last completed run for ${gh.key} — compact pass\n`,
  );
  return {
    mode: "add",
    pr,
    ticket: null,
    workspace,
    print,
    agentForward,
    hint: "The PR branch HEAD is unchanged since the last successful `pr` run for this PR. Keep the review concise: merge readiness, regressions, or gaps you might have missed.",
    stateKey: gh.key,
    headOid: gh.headOid,
    autoPicked: true,
  };
}
