import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  discoverSkills,
  discoverSkillsInRoot,
  defaultSkillRoots,
  displayPath,
  projectSkillRoots,
  resolveLintScopes,
} from "./discover.ts";
import {
  globalSkillRootSuffixes,
  projectSkillRootSuffixes,
} from "./skill-roots.ts";

async function withTempDir(
  run: (dir: string) => Promise<void>
): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-discover-"));
  try {
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("discover", () => {
  it("finds skills under a root directory", async () => {
    await withTempDir(async (dir) => {
      const root = path.join(dir, ".cursor", "skills");
      await mkdir(path.join(root, "alpha"), { recursive: true });
      await mkdir(path.join(root, "beta"), { recursive: true });
      await writeFile(path.join(root, "alpha", "SKILL.md"), "# Alpha\n");
      await writeFile(path.join(root, "beta", "SKILL.md"), "# Beta\n");
      await mkdir(path.join(root, "notes"), { recursive: true });
      await writeFile(path.join(root, "notes", "README.md"), "# Notes\n");

      const skills = await discoverSkillsInRoot({
        scope: "project",
        path: root,
      });

      assert.deepEqual(
        skills.map((skill) => skill.name),
        ["alpha", "beta"]
      );
    });
  });

  it("walks parent directories for project roots", async () => {
    await withTempDir(async (dir) => {
      const nested = path.join(dir, "apps", "demo");
      await mkdir(nested, { recursive: true });

      const roots = projectSkillRoots(nested).map((root) => root.path);
      assert.ok(roots.includes(path.join(dir, ".agents", "skills")));
      assert.ok(roots.includes(path.join(dir, ".claude", "skills")));
      assert.ok(roots.includes(path.join(dir, ".opencode", "skills")));
      assert.ok(roots.includes(path.join(dir, ".cursor", "skills")));
      assert.ok(!roots.includes(path.join(dir, ".cursor", "skills-cursor")));
      assert.ok(roots.includes(path.join(nested, ".cursor", "skills")));

      const withBuiltin = projectSkillRoots(nested, {
        includeCursorBuiltin: true,
      }).map((root) => root.path);
      assert.ok(withBuiltin.includes(path.join(dir, ".cursor", "skills-cursor")));
    });
  });

  it("excludes skills-cursor from default skill roots", () => {
    const home = os.homedir();
    const roots = defaultSkillRoots();
    assert.ok(roots.includes(path.join(home, ".agents", "skills")));
    assert.ok(roots.includes(path.join(home, ".claude", "skills")));
    assert.ok(roots.includes(path.join(home, ".config", "opencode", "skills")));
    assert.ok(roots.includes(path.join(home, ".cursor", "skills")));
    assert.ok(!roots.includes(path.join(home, ".cursor", "skills-cursor")));
  });

  it("includes skills.sh project and global-only roots", () => {
    const project = projectSkillRootSuffixes().map((suffix) => suffix.join("/"));
    assert.ok(project.includes(".claude/skills"));
    assert.ok(project.includes(".opencode/skills"));
    assert.ok(project.includes("skills"));

    const globalOnly = globalSkillRootSuffixes()
      .map((suffix) => suffix.join("/"))
      .filter((root) => root.includes("config/opencode"));
    assert.deepEqual(globalOnly, [".config/opencode/skills"]);
  });

  it("includes skills-cursor when requested", () => {
    const home = os.homedir();
    const roots = defaultSkillRoots({ includeCursorBuiltin: true });
    assert.ok(roots.includes(path.join(home, ".cursor", "skills-cursor")));
  });

  it("shortens home paths for display", () => {
    const home = os.homedir();
    assert.equal(displayPath(home), "~");
    assert.equal(
      displayPath(path.join(home, ".agents", "skills")),
      "~/.agents/skills"
    );
  });

  it("deduplicates repeated roots while listing skills", async () => {
    await withTempDir(async (dir) => {
      const root = path.join(dir, ".cursor", "skills");
      await mkdir(path.join(root, "solo"), { recursive: true });
      await writeFile(path.join(root, "solo", "SKILL.md"), "# Solo\n");

      const skills = await discoverSkills([
        { scope: "project", path: root },
        { scope: "project", path: root },
      ]);

      assert.equal(skills.length, 1);
      assert.equal(skills[0]?.name, "solo");
    });
  });

  it("resolves a skill file path to every markdown file in its folder", async () => {
    await withTempDir(async (dir) => {
      const skillDir = path.join(dir, "demo");
      await mkdir(path.join(skillDir, "references"), { recursive: true });
      await writeFile(path.join(skillDir, "SKILL.md"), "# Demo\n");
      await writeFile(path.join(skillDir, "references", "guide.md"), "# Guide\n");

      const files = await resolveLintScopes([path.join(skillDir, "SKILL.md")]);
      assert.deepEqual(
        files.map((file) => path.relative(skillDir, file)).sort(),
        ["SKILL.md", path.join("references", "guide.md")].sort()
      );
    });
  });

  it("resolves a directory path to markdown files under it", async () => {
    await withTempDir(async (dir) => {
      const skillDir = path.join(dir, "demo");
      await mkdir(skillDir, { recursive: true });
      await writeFile(path.join(skillDir, "SKILL.md"), "# Demo\n");
      await writeFile(path.join(skillDir, "NOTES.md"), "# Notes\n");

      const files = await resolveLintScopes([skillDir]);
      assert.deepEqual(
        files.map((file) => path.basename(file)).sort(),
        ["NOTES.md", "SKILL.md"]
      );
    });
  });
});
