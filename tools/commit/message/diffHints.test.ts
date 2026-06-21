import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { StagedFile } from "../types.ts";
import {
  bestDiffHintSummary,
  fileBasenameSummary,
  hintsFromDiff,
  isGenericSummary,
  isScopeEcho,
  summarizeAddedFiles
} from "./diffHints.ts";

function file(path: string, status: StagedFile["status"] = "M"): StagedFile {
  return { path, status };
}

describe("isScopeEcho", () => {
  it("detects summaries that repeat the scope", () => {
    assert.equal(isScopeEcho("memory", "memory"), true);
    assert.equal(isScopeEcho("improve memory", "memory"), true);
    assert.equal(isScopeEcho("add diff hint commit summaries", "memory"), false);
  });
});

describe("isGenericSummary", () => {
  it("flags vague single-word scope summaries", () => {
    assert.equal(isGenericSummary(""), true);
    assert.equal(isGenericSummary("update memory"), true);
    assert.equal(isGenericSummary("add partial folder promote flow"), false);
  });
});

describe("hintsFromDiff", () => {
  it("detects keyboard shortcut changes", () => {
    const diff = [
      "diff --git a/tools/dotfiles/interactive.ts b/tools/dotfiles/interactive.ts",
      "+++ b/tools/dotfiles/interactive.ts",
      "+    o: openPath,"
    ].join("\n");
    const hints = hintsFromDiff(diff, [file("tools/dotfiles/interactive.ts")]);
    assert.ok(hints.summaries.some((s) => s.includes("open")));
  });

  it("summarizes added markdown headings", () => {
    const diff = [
      "diff --git a/AGENTS.md b/AGENTS.md",
      "+++ b/AGENTS.md",
      "+# Agent memory"
    ].join("\n");
    const hints = hintsFromDiff(diff, [file("AGENTS.md")]);
    assert.ok(hints.summaries.some((s) => s.includes("agent memory")));
  });
});

describe("bestDiffHintSummary", () => {
  it("skips summaries that echo the scope", () => {
    const diff = [
      "diff --git a/tools/dotfiles/interactive.ts b/tools/dotfiles/interactive.ts",
      "+++ b/tools/dotfiles/interactive.ts",
      "+    o: openPath,"
    ].join("\n");
    const summary = bestDiffHintSummary(
      diff,
      [file("tools/dotfiles/interactive.ts")],
      "dotfiles"
    );
    assert.equal(summary, "add open shortcut in interactive UI");
  });
});

describe("fileBasenameSummary", () => {
  it("labels known tool entry files", () => {
    const summary = fileBasenameSummary([file("tools/dotfiles/interactive.ts")]);
    assert.equal(summary, "update interactive UI");
  });
});

describe("summarizeAddedFiles", () => {
  it("recognizes new test files", () => {
    assert.equal(
      summarizeAddedFiles([file("tools/memory/slug.test.ts", "A")]),
      "add commit message fixtures"
    );
  });
});
