import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { displayPath } from "../discover.ts";
import { formatDiagnostic, formatFileDiagnostics } from "./format.ts";

describe("formatDiagnostic", () => {
  it("uses compiler-style location and code", () => {
    const line = formatDiagnostic("/tmp/SKILL.md", {
      line: 8,
      column: 12,
      code: "long-line",
      message: "Line exceeds 160 characters (201).",
    });
    assert.match(line, /\/tmp\/SKILL\.md:8:12/);
    assert.match(line, /warning/);
    assert.match(line, /long-line/);
    assert.match(line, /Line exceeds 160 characters/);
  });

  it("shortens home paths to ~/", () => {
    const home = os.homedir();
    const filePath = path.join(home, ".agents", "skills", "jira", "SKILL.md");
    const line = formatDiagnostic(filePath, {
      line: 3,
      column: 1,
      code: "long-line",
      message: "Line exceeds 160 characters (193).",
    });
    assert.match(line, /~\/\.agents\/skills\/jira\/SKILL\.md:3:1/);
    assert.equal(displayPath(filePath), "~/.agents/skills/jira/SKILL.md");
  });

  it("prints errors with an error severity label", () => {
    const line = formatDiagnostic("/tmp/SKILL.md", {
      line: 1,
      column: 1,
      code: "skill-length",
      severity: "error",
      message: "SKILL.md exceeds 500 lines (501).",
    });
    assert.match(line, /error skill-length/);
  });
});

describe("formatFileDiagnostics", () => {
  it("prints the path once with indented line:col diagnostics", () => {
    const output = formatFileDiagnostics("/tmp/SKILL.md", [
      {
        line: 8,
        column: 12,
        code: "long-line",
        message: "Line exceeds 160 characters (201).",
      },
      {
        line: 1,
        column: 1,
        code: "skill-length",
        severity: "error",
        message: "SKILL.md exceeds 500 lines (501).",
      },
    ]);
    assert.equal(output.split("\n").length, 3);
    assert.match(output, /^\/tmp\/SKILL\.md$/m);
    assert.match(output, /^\s+8:12 warning long-line:/m);
    assert.match(output, /^\s+1:1 error skill-length:/m);
    assert.doesNotMatch(output, /\/tmp\/SKILL\.md:8:12/);
  });

  it("shortens home paths to ~/", () => {
    const home = os.homedir();
    const filePath = path.join(home, ".agents", "skills", "jira", "SKILL.md");
    const output = formatFileDiagnostics(filePath, [
      {
        line: 3,
        column: 1,
        code: "long-line",
        message: "Line exceeds 160 characters (193).",
      },
    ]);
    assert.match(output, /^~\/\.agents\/skills\/jira\/SKILL\.md$/m);
    assert.match(output, /^\s+3:1 warning long-line:/m);
  });
});
