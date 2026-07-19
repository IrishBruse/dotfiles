import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { displayPath } from "../discover.ts";
import { formatDiagnostic } from "./format.ts";

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
});
