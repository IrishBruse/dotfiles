import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { displayPath } from "../../discover.ts";
import { stripAnsi } from "./color.ts";
import { formatDiagnostic, formatFileDiagnostics, formatFixedFiles, LOCATION_WIDTH } from "./format.ts";

describe("formatDiagnostic", () => {
  it("uses eslint-style location, message, and @rule id", () => {
    const line = formatDiagnostic("/tmp/SKILL.md", {
      line: 8,
      column: 12,
      code: "long-line",
      message: "Line exceeds 160 characters (201).",
    });
    assert.match(line, /\/tmp\/SKILL\.md:8:12/);
    assert.match(line, /warning/);
    assert.match(line, /@skills\/long-line\(fixable\)/);
    assert.match(line, /Line exceeds 160 characters/);
    assert.doesNotMatch(line, /long-line:/);
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
    assert.match(line, /error/);
    assert.match(line, /@skills\/skill-length/);
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
    assert.match(output, /^\s+8:12\s+warning\s+Line exceeds.*@skills\/long-line\(fixable\)/m);
    assert.match(output, /^\s+1:1\s+error\s+SKILL\.md exceeds.*@skills\/skill-length$/m);
    assert.doesNotMatch(output, /skill-length\(fixable\)/);
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
    assert.match(output, /^\s+3:1\s+warning\s+Line exceeds.*@skills\/long-line/m);
  });

  it("aligns columns across diagnostics in a file", () => {
    const output = formatFileDiagnostics("/tmp/SKILL.md", [
      {
        line: 2,
        column: 15,
        code: "prose-semicolon",
        message: "Missing semicolon",
      },
      {
        line: 6,
        column: 7,
        code: "negation-steering",
        severity: "error",
        message: "'result' is assigned a value but never used",
      },
    ]);
    const detailLines = output.split("\n").slice(1).map(stripAnsi);
    const ruleStarts = detailLines.map((line) => line.indexOf("@skills/"));
    assert.equal(ruleStarts.length, 2);
    assert.equal(ruleStarts[0], ruleStarts[1]);
    assert.equal(LOCATION_WIDTH, "999:999".length);
    assert.match(detailLines[0] ?? "", /^\s+2:15\s{5}warning\s+Missing semicolon\s+@skills\/prose-semicolon\(fixable\)$/);
    assert.match(detailLines[1] ?? "", /^\s+6:7\s{6}error\s+'result' is assigned.*@skills\/negation-steering$/);
    assert.doesNotMatch(detailLines[1] ?? "", /negation-steering\(fixable\)/);
  });
});

describe("formatFixedFiles", () => {
  it("lists fixed files under a single header", () => {
    const output = formatFixedFiles(["/tmp/a.md", "/tmp/b.md"]);
    assert.equal(output.split("\n").length, 3);
    assert.match(output, /^fixed \(2 files\)/m);
    assert.match(output, /^\s+\/tmp\/a\.md$/m);
    assert.match(output, /^\s+\/tmp\/b\.md$/m);
  });

  it("returns empty output when nothing was fixed", () => {
    assert.equal(formatFixedFiles([]), "");
  });
});
