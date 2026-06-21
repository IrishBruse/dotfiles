import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCommitSubject } from "./output.ts";

describe("formatCommitSubject", () => {
  it("leaves plain messages unchanged when color is off", () => {
    assert.equal(formatCommitSubject("misc: update lockfile", false), "misc: update lockfile");
  });

  it("parses scoped conventional commit subjects", () => {
    const out = formatCommitSubject("tools(memory): add slug validation", false);
    assert.match(out, /tools\(memory\): add slug validation/);
  });

  it("adds ANSI styling when color is on", () => {
    const out = formatCommitSubject("tools(memory): add slug validation", true);
    assert.match(out, /\x1b\[/);
    assert.match(out, /add slug validation/);
  });
});
