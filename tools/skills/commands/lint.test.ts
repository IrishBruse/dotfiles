import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { runLint } from "./lint.ts";

async function captureStderr(run: () => Promise<number>): Promise<{
  code: number;
  output: string;
}> {
  const chunks: string[] = [];
  const originalWrite = process.stderr.write.bind(process.stderr);
  process.stderr.write = ((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  try {
    const code = await run();
    return { code, output: chunks.join("") };
  } finally {
    process.stderr.write = originalWrite;
  }
}

describe("runLint --fix output", () => {
  let tempDir = "";

  before(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "skills-lint-fix-"));
    await mkdir(path.join(tempDir, "clean-fix"), { recursive: true });
    await mkdir(path.join(tempDir, "partial-fix"), { recursive: true });
  });

  after(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("lists only fully clean files in the fixed section", async () => {
    const cleanPath = path.join(tempDir, "clean-fix", "SKILL.md");
    await writeFile(
      cleanPath,
      `---
name: clean-fix
description: Use when testing clean fixes.
---
First idea; second idea.
`
    );

    const partialPath = path.join(tempDir, "partial-fix", "SKILL.md");
    await writeFile(
      partialPath,
      `---
name: partial-fix
description: Summary without trigger phrase.
---
First idea; second idea.
`
    );

    const { code, output } = await captureStderr(() =>
      runLint(["--fix", tempDir])
    );

    assert.equal(code, 1);
    assert.doesNotMatch(output, /clean-fix\/SKILL\.md:\d+:\d+/);
    assert.match(output, /partial-fix\/SKILL\.md/);
    assert.match(output, /description-triggers/);
    assert.match(output, /fixed \(1 file\)/);
    assert.match(output, new RegExp(`\\s+${cleanPath.replaceAll("/", "\\/")}`));
    assert.doesNotMatch(
      output,
      new RegExp(`\\s+${partialPath.replaceAll("/", "\\/")}`)
    );
  });
});
