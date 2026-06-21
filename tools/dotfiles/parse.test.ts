import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { emptySummary, parseStowOutput } from "./parse.ts";
import { buildTree, formatPathTree, formatPathTreeEntries } from "./tree.ts";

describe("parseStowOutput", () => {
  it("starts from an empty summary", () => {
    assert.deepEqual(emptySummary(), {
      linked: [],
      removed: [],
      unchanged: [],
      warnings: [],
      conflicts: []
    });
  });

  it("classifies stow dry-run lines", () => {
    const lines = [
      "LINK: foo/.bashrc => ../dotfiles/home/.bashrc",
      "UNLINK: bar/.vimrc (would remove)",
      "--- Skipping baz/.gitconfig as it already points to ../dotfiles/home/.gitconfig",
      "CONFLICT when stowing: conflict-file",
      "MKDIR: new-dir (would create)",
      "RMDIR: old-dir (would remove)",
      "MV: moved-file"
    ];
    const summary = parseStowOutput(lines);
    assert.deepEqual(summary.linked, ["foo/.bashrc"]);
    assert.deepEqual(summary.removed, ["bar/.vimrc"]);
    assert.deepEqual(summary.unchanged, ["baz/.gitconfig"]);
    assert.deepEqual(summary.conflicts, ["conflict-file"]);
    assert.equal(summary.warnings.length, 3);
  });
});

describe("buildTree", () => {
  it("nests path segments", () => {
    const root = buildTree(["a/b/c.ts", "a/d.ts"]);
    const a = root.children.get("a")!;
    assert.ok(a.children.has("b"));
    assert.ok(a.children.has("d.ts"));
  });
});

describe("formatPathTree", () => {
  it("renders sorted tree lines with roles", () => {
    const lines = formatPathTree(
      [".config/foo", ".config/foo/bar"],
      (prefix, name, role) => `${prefix}${name}${role === "group" ? "*" : ""}`
    );
    assert.deepEqual(lines, [".config*", "└── foo", "    └── bar"]);
  });
});

describe("formatPathTreeEntries", () => {
  it("includes full stow paths for each rendered line", () => {
    const entries = formatPathTreeEntries(
      [".config/foo", ".config/foo/bar"],
      (_prefix, name) => name
    );
    assert.deepEqual(
      entries.map((entry) => entry.fullPath),
      [".config", ".config/foo", ".config/foo/bar"]
    );
  });
});
