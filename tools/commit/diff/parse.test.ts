import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  countDiffLines,
  filterDiff,
  filterNameStatus,
  parseAddedLinesByFile,
  parseNameStatus,
  parseRemovedLinesByFile
} from "./parse.ts";

describe("parseNameStatus", () => {
  it("parses added, modified, and deleted paths", () => {
    const text = "A\ttools/new.ts\nM\ttools/old.ts\nD\ttools/gone.ts\n";
    const files = parseNameStatus(text);
    assert.equal(files.length, 3);
    assert.deepEqual(files[0], { status: "A", path: "tools/new.ts" });
    assert.deepEqual(files[1], { status: "M", path: "tools/old.ts" });
    assert.deepEqual(files[2], { status: "D", path: "tools/gone.ts" });
  });

  it("parses renames with previous path", () => {
    const text = "R100\told/name.ts\tnew/name.ts\n";
    const files = parseNameStatus(text);
    assert.equal(files.length, 1);
    assert.deepEqual(files[0], {
      status: "R",
      path: "new/name.ts",
      previousPath: "old/name.ts"
    });
  });
});

describe("parseAddedLinesByFile", () => {
  it("groups added lines by file path", () => {
    const diff = [
      "diff --git a/foo.ts b/foo.ts",
      "--- a/foo.ts",
      "+++ b/foo.ts",
      "@@ -1 +1,2 @@",
      "+line one",
      "+line two"
    ].join("\n");
    const byFile = parseAddedLinesByFile(diff);
    assert.deepEqual(byFile.get("foo.ts"), ["line one", "line two"]);
  });
});

describe("parseRemovedLinesByFile", () => {
  it("groups removed lines by file path", () => {
    const diff = [
      "diff --git a/foo.ts b/foo.ts",
      "--- a/foo.ts",
      "+++ b/foo.ts",
      "@@ -1,2 +1 @@",
      "-old line"
    ].join("\n");
    const byFile = parseRemovedLinesByFile(diff);
    assert.deepEqual(byFile.get("foo.ts"), ["old line"]);
  });
});

describe("countDiffLines", () => {
  it("counts added and removed lines excluding headers", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "--- a/a.ts",
      "+++ b/a.ts",
      "+added",
      "-removed",
      " context"
    ].join("\n");
    assert.deepEqual(countDiffLines(diff), { added: 1, removed: 1 });
  });
});

describe("filterNameStatus", () => {
  it("keeps only paths in the set", () => {
    const text = "M\ta.ts\nM\tb.ts\n";
    const filtered = filterNameStatus(text, new Set(["b.ts"]));
    assert.equal(filtered, "M\tb.ts");
  });

  it("keeps renames when either path matches", () => {
    const text = "R100\told.ts\tnew.ts\n";
    const filtered = filterNameStatus(text, new Set(["old.ts"]));
    assert.equal(filtered, text.trimEnd());
  });
});

describe("filterDiff", () => {
  it("keeps only diff chunks for selected paths", () => {
    const diff = [
      "diff --git a/a.ts b/a.ts",
      "--- a/a.ts",
      "+++ b/a.ts",
      "+a",
      "diff --git a/b.ts b/b.ts",
      "--- a/b.ts",
      "+++ b/b.ts",
      "+b"
    ].join("\n");
    const filtered = filterDiff(diff, new Set(["b.ts"]));
    assert.match(filtered, /b\.ts/);
    assert.doesNotMatch(filtered, /a\.ts/);
  });

  it("returns empty string for empty diff", () => {
    assert.equal(filterDiff("", new Set(["a.ts"])), "");
  });
});
