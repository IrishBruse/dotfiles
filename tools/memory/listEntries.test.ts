import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { formatListMarkdown } from "./listEntries.ts";
import { localStore } from "./scope.ts";

describe("formatListMarkdown", () => {
  const home = os.homedir();

  it("renders local and global sections", async () => {
    const gitBase = path.join(home, "git");
    await mkdir(gitBase, { recursive: true });
    const repoRoot = path.join(gitBase, "memtest-list");
    const cwd = path.join(repoRoot, "src");
    await mkdir(cwd, { recursive: true });

    const local = localStore(cwd);
    await mkdir(path.dirname(local.entriesPath), { recursive: true });
    await writeFile(
      local.entriesPath,
      JSON.stringify([
        { id: "local-one", text: "local lesson", hasDetails: false }
      ]),
      "utf8"
    );

    try {
      const out = await formatListMarkdown({ cwd });
      assert.match(out, /## Local \(memtest-list\)/);
      assert.match(out, /local-one/);
      assert.match(out, /## Global/);
    } finally {
      await rm(local.entriesPath, { force: true });
    }
  });

  it("renders global only with globalOnly", async () => {
    const savedHome = process.env.HOME;
    const homeTmp = path.join(os.tmpdir(), `memory-global-${Date.now()}`);
    process.env.HOME = homeTmp;
    const globalPath = path.join(homeTmp, ".agents", "memory", "global.json");
    await mkdir(path.dirname(globalPath), { recursive: true });
    await writeFile(
      globalPath,
      JSON.stringify([
        { id: "only-global", text: "cross-repo", hasDetails: false }
      ]),
      "utf8"
    );

    try {
      const out = await formatListMarkdown({
        cwd: path.join(homeTmp, "any"),
        globalOnly: true
      });
      assert.match(out, /## Global/);
      assert.match(out, /only-global/);
      assert.doesNotMatch(out, /## Local/);
    } finally {
      process.env.HOME = savedHome ?? home;
      await rm(path.join(homeTmp, ".agents"), { recursive: true, force: true });
    }
  });
});
