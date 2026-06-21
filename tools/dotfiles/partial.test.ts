import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { analyzePartialFolder, findPartialFolders } from "./partial.ts";

function withPartialFixture(
  fn: (dirs: { packageRoot: string; targetRoot: string }) => void
): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dotfiles-partial-"));
  try {
    const packageRoot = path.join(root, "home");
    const targetRoot = path.join(root, "target");
    const folderPath = ".config/foo";
    const packageDir = path.join(packageRoot, folderPath);
    const targetDir = path.join(targetRoot, folderPath);

    fs.mkdirSync(packageDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(packageDir, "bar"), "linked\n");
    fs.symlinkSync(
      path.join(packageDir, "bar"),
      path.join(targetDir, "bar")
    );

    fn({ packageRoot, targetRoot });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

describe("analyzePartialFolder", () => {
  it("marks folders promotable when only stowed symlinks remain", () => {
    withPartialFixture(({ packageRoot, targetRoot }) => {
      const analysis = analyzePartialFolder(
        ".config/foo",
        [".config/foo/bar"],
        packageRoot,
        targetRoot
      );
      assert.equal(analysis.promotable, true);
      assert.equal(analysis.blockerCount, 0);
      assert.match(analysis.summary, /ready to promote/);
    });
  });
});

describe("findPartialFolders", () => {
  it("discovers partially stowed parent folders", () => {
    withPartialFixture(({ packageRoot, targetRoot }) => {
      const analyses = findPartialFolders(
        [".config/foo/bar"],
        packageRoot,
        targetRoot
      );
      assert.equal(analyses.length, 1);
      assert.equal(analyses[0]!.folderPath, ".config/foo");
    });
  });
});
