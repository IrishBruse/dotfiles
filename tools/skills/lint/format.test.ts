import assert from "node:assert/strict";
import { describe, it } from "node:test";

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
});
