import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { importDotfilePathAt, normalizeStowPath } from "./import.ts";

describe("normalizeStowPath", () => {
  it("accepts dot-relative paths", () => {
    assert.equal(normalizeStowPath(".zshrc"), ".zshrc");
    assert.equal(normalizeStowPath(".config/fish"), ".config/fish");
  });

  it("accepts tilde paths", () => {
    assert.equal(normalizeStowPath("~/.zshrc"), ".zshrc");
  });

  it("accepts absolute paths under home", () => {
    const home = os.homedir();
    assert.equal(normalizeStowPath(path.join(home, ".vimrc")), ".vimrc");
  });

  it("rejects paths outside home", () => {
    assert.equal(normalizeStowPath("/etc/passwd"), null);
    assert.equal(normalizeStowPath("~"), null);
  });
});

describe("importDotfilePathAt", () => {
  it("moves a file from the target into the package", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dotfiles-import-"));
    try {
      const repoRoot = path.join(root, "repo");
      const packageRoot = path.join(repoRoot, "home");
      const targetRoot = path.join(root, "target");
      const relPath = ".dotfiles-import-test";
      const source = path.join(targetRoot, relPath);
      const dest = path.join(packageRoot, relPath);

      fs.mkdirSync(targetRoot, { recursive: true });
      fs.writeFileSync(source, "hello\n");

      const result = importDotfilePathAt(
        relPath,
        { repoRoot, packageName: "home", targetRoot },
        []
      );

      assert.equal(result.ok, true);
      assert.equal(result.mode, "move");
      assert.deepEqual(result.imported, [relPath]);
      assert.equal(fs.existsSync(source), false);
      assert.equal(fs.readFileSync(dest, "utf8"), "hello\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("errors when the package path already exists", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "dotfiles-import-"));
    try {
      const repoRoot = path.join(root, "repo");
      const packageRoot = path.join(repoRoot, "home");
      const targetRoot = path.join(root, "target");
      const relPath = ".dotfiles-import-dup";
      const source = path.join(targetRoot, relPath);
      const dest = path.join(packageRoot, relPath);

      fs.mkdirSync(targetRoot, { recursive: true });
      fs.writeFileSync(source, "src\n");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, "dest\n");

      const result = importDotfilePathAt(
        relPath,
        { repoRoot, packageName: "home", targetRoot },
        []
      );

      assert.equal(result.ok, false);
      assert.match(result.error ?? "", /already in package/);
      assert.equal(fs.readFileSync(source, "utf8"), "src\n");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
