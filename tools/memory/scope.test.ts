import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { globalStore, memoryBaseDir } from "./paths.ts";
import {
  localStore,
  resolveLocalRoot,
  resolveScopeKey,
  scopeLabel,
  storeForScopeKey,
} from "./scope.ts";

describe("resolveLocalRoot", () => {
  const home = os.homedir();
  const gitBase = path.join(home, "git");

  it("maps ~/git/<repo>/nested to repo root", () => {
    assert.equal(
      resolveLocalRoot(path.join(gitBase, "GRun", "src")),
      path.join(gitBase, "GRun")
    );
  });

  it("uses cwd exactly outside ~/git", () => {
    const cwd = path.join(home, "dotfiles", "foo");
    assert.equal(resolveLocalRoot(cwd), cwd);
  });

  it("does not map ~/dotfiles/foo to ~/dotfiles", () => {
    const cwd = path.join(home, "dotfiles", "foo");
    assert.notEqual(resolveLocalRoot(cwd), path.join(home, "dotfiles"));
  });
});

describe("resolveScopeKey", () => {
  const home = os.homedir();

  it("uses repo name under ~/git", () => {
    assert.deepEqual(resolveScopeKey(path.join(home, "git", "GRun", "src")), {
      kind: "repo",
      name: "GRun",
    });
  });

  it("uses home-relative path outside ~/git", () => {
    assert.deepEqual(resolveScopeKey(path.join(home, "dotfiles", "foo")), {
      kind: "misc",
      name: "dotfiles/foo",
    });
  });

  it("maps ~ to home", () => {
    assert.deepEqual(resolveScopeKey(home), { kind: "misc", name: "home" });
  });
});

describe("localStore", () => {
  const home = os.homedir();
  const base = path.join(home, ".agents", "memory");

  it("places repo data in repos/<repo>.json", () => {
    const store = localStore(path.join(home, "git", "GRun", "src"));
    assert.equal(store.entriesPath, path.join(base, "repos", "GRun.json"));
  });

  it("places misc data in misc/<path>.json", () => {
    const cwd = path.join(home, "dotfiles", "foo");
    const store = localStore(cwd);
    assert.equal(store.entriesPath, path.join(base, "misc", "dotfiles/foo.json"));
  });
});

describe("scopeLabel", () => {
  it("labels repo and misc scopes", () => {
    assert.equal(scopeLabel({ kind: "repo", name: "GRun" }), "GRun");
    assert.equal(scopeLabel({ kind: "misc", name: "dotfiles/foo" }), "dotfiles/foo");
    assert.equal(scopeLabel({ kind: "misc", name: "home" }), "~");
  });
});

describe("storeForScopeKey", () => {
  const home = os.homedir();
  const base = path.join(home, ".agents", "memory");

  it("maps keys to consistent json paths", () => {
    assert.equal(
      storeForScopeKey({ kind: "repo", name: "GRun" }).entriesPath,
      path.join(base, "repos", "GRun.json")
    );
    assert.equal(
      storeForScopeKey({ kind: "misc", name: "dotfiles" }).entriesPath,
      path.join(base, "misc", "dotfiles.json")
    );
  });
});

describe("globalStore", () => {
  it("uses ~/.agents/memory/global.json", () => {
    const store = globalStore();
    assert.equal(store.entriesPath, path.join(memoryBaseDir(), "global.json"));
  });
});
