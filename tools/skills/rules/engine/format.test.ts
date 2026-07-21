import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { displayPath } from "../../discover.ts";
import { stripAnsi } from "./color.ts";
import { formatDiagnostic, formatFileDiagnostics, formatFixedFiles, formatSummary, LOCATION_WIDTH, SEVERITY_WIDTH } from "./format.ts";
import { outputColorEnabled } from "./color.ts";

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

  it("omits fixable for long lines that cannot be auto-wrapped", () => {
    const line = formatDiagnostic("/tmp/SKILL.md", {
      line: 2,
      column: 1,
      code: "long-line",
      message: "Line exceeds 160 characters (344). Wrap or split into shorter lines.",
      fixable: false,
    });
    assert.match(line, /@skills\/long-line$/);
    assert.doesNotMatch(line, /\(fixable\)/);
  });

  it("styles fixable suffix in green when color is enabled", () => {
    const line = formatDiagnostic("/tmp/SKILL.md", {
      line: 8,
      column: 12,
      code: "long-line",
      message: "Line exceeds 160 characters (201).",
    });
    if (outputColorEnabled()) {
      assert.match(line, /\u001b\[2m@skills\/long-line\u001b\[0m\u001b\[32m\(fixable\)/);
    } else {
      assert.match(line, /@skills\/long-line\(fixable\)/);
    }
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
    assert.match(output, /^\s+1:1\s+error  \s+SKILL\.md exceeds.*@skills\/skill-length$/m);
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
    assert.equal(SEVERITY_WIDTH, "warning".length);
    assert.match(detailLines[0] ?? "", /^\s+2:15\s{5}warning\s+Missing semicolon\s+@skills\/prose-semicolon\(fixable\)$/);
    assert.match(detailLines[1] ?? "", /^\s+6:7\s+error  \s+'result' is assigned.*@skills\/negation-steering$/);
    assert.doesNotMatch(detailLines[1] ?? "", /negation-steering\(fixable\)/);
  });

  it("ends each file block with a blank line for separation", () => {
    const block = `${formatFileDiagnostics("/tmp/SKILL.md", [
      {
        line: 1,
        column: 1,
        code: "long-line",
        message: "Line exceeds 160 characters (201).",
      },
    ])}\n\n`;
    assert.ok(block.endsWith("\n\n"));
  });
});

describe("formatSummary", () => {
  it("colors warnings, errors, and file counts", () => {
    const output = formatSummary(34, 2, 12, 22, 68);
    if (outputColorEnabled()) {
      assert.match(output, /\u001b\[33m34 warnings\u001b\[0m/);
      assert.match(output, /\u001b\[31m2 errors\u001b\[0m/);
      assert.match(output, /\u001b\[32m12 fixable\u001b\[0m/);
      assert.match(output, /\u001b\[36m22 files\u001b\[0m/);
      assert.match(output, /\u001b\[36m68 files\u001b\[0m/);
    } else {
      assert.equal(
        output,
        "34 warnings, 2 errors, 12 fixable in 22 files (checked 68 files)"
      );
    }
  });

  it("omits fixable when there are none", () => {
    const output = formatSummary(3, 0, 0, 2, 10);
    assert.doesNotMatch(output, /fixable/);
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
