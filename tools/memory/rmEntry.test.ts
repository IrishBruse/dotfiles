import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { runRm } from "./rmEntry.ts";

describe("runRm", () => {
  const home = os.homedir();

  it("removes a local entry and its reference", async () => {
    const gitBase = path.join(home, "git");
    await mkdir(gitBase, { recursive: true });
    const repoRoot = path.join(gitBase, "memtest-rm");
    const cwd = path.join(repoRoot, "src");
    await mkdir(cwd, { recursive: true });

    const entriesPath = path.join(
      home,
      ".agents",
      "memory",
      "repos",
      "memtest-rm.json"
    );
    const referencePath = path.join(
      home,
      ".agents",
      "memory",
      "references",
      "repos",
      "memtest-rm",
      "gone.md"
    );
    await mkdir(path.dirname(entriesPath), { recursive: true });
    await mkdir(path.dirname(referencePath), { recursive: true });
    await writeFile(
      entriesPath,
      JSON.stringify([{ id: "gone", text: "old lesson", hasDetails: true }]),
      "utf8"
    );
    await writeFile(referencePath, "detail\n", "utf8");

    const prevCwd = process.cwd();
    process.chdir(cwd);
    try {
      await runRm(["gone"], { global: false });
      const raw = await readFile(entriesPath, "utf8");
      assert.deepEqual(JSON.parse(raw), []);
      assert.equal(existsSync(referencePath), false);
    } finally {
      process.chdir(prevCwd);
      await rm(entriesPath, { force: true });
      await rm(path.dirname(referencePath), { recursive: true, force: true });
    }
  });

  it("errors when the id is missing", async () => {
    await assert.rejects(
      () => runRm(["missing-id"], { global: false }),
      /No entry with id "missing-id"/
    );
  });
});
