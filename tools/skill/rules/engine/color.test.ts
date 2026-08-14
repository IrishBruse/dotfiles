import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatOutput, outputColorEnabled, paintOutput, stripAnsi } from "./color.ts";

describe("lint color", () => {
  it("strips ansi escape sequences", () => {
    assert.equal(stripAnsi("\u001b[33mwarning\u001b[0m"), "warning");
  });

  it("returns plain text when color is disabled", () => {
    if (outputColorEnabled()) return;
    assert.equal(paintOutput("warn", "warning"), "warning");
    assert.equal(formatOutput("\u001b[33mwarning\u001b[0m"), "warning");
  });
});
