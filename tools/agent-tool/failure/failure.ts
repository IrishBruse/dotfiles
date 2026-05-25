/// <reference types="node" />
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { collectDiagnostics } from "./diagnostics.ts";
import { parseFailureArgs } from "./parseArgs.ts";

const logPath = path.join(os.homedir(), ".agents", "agent-failures.jsonl");

type LogLine = {
  kind: "user_correction";
  summary: string;
  skills?: string[];
  diagnostics: ReturnType<typeof collectDiagnostics>;
};

export function runFailure(argv: string[]): void {
  const parsed = parseFailureArgs(argv);
  if (parsed.ok === false) {
    console.error(parsed.error);
    process.exitCode = 1;
    return;
  }

  const { summary, skills } = parsed;

  if (summary.length === 0) {
    console.error(
      'failure: pass a short summary of the correction, e.g. agent-tool failure "wrong file edited" --skills questions,agent-failures'
    );
    process.exitCode = 1;
    return;
  }

  const hadSkillsFlag = argv.some(
    (a) => a === "--skills" || a.startsWith("--skills=")
  );
  if (hadSkillsFlag && skills.length === 0) {
    console.error(
      "failure: --skills needs a non-empty comma-separated list, e.g. --skills questions,standup"
    );
    process.exitCode = 1;
    return;
  }

  const dir = path.dirname(logPath);
  fs.mkdirSync(dir, { recursive: true });

  const line: LogLine = {
    kind: "user_correction",
    summary,
    diagnostics: collectDiagnostics()
  };
  if (skills.length > 0) {
    line.skills = skills;
  }

  fs.appendFileSync(logPath, `${JSON.stringify(line)}\n`, "utf8");
  console.error(`appended to ${logPath}`);
}
