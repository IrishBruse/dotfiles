import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
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
  resolveLintTargets,
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

  it("finds skills nested under category folders", async () => {
    await withTempDir(async (dir) => {
      const root = path.join(dir, ".agents", "skills");
      const nested = path.join(root, "github", "pr");
      const manual = path.join(root, "github", "_command", "commits");
      const flat = path.join(root, "browser");
      await mkdir(nested, { recursive: true });
      await mkdir(path.join(nested, "references"), { recursive: true });
      await mkdir(manual, { recursive: true });
      await mkdir(flat, { recursive: true });
      await writeFile(path.join(nested, "SKILL.md"), "# PR\n");
      await writeFile(path.join(nested, "references", "guide.md"), "# Guide\n");
      await writeFile(path.join(manual, "SKILL.md"), "# Commits\n");
      await writeFile(path.join(flat, "SKILL.md"), "# Browser\n");

      const skills = await discoverSkillsInRoot({
        scope: "global",
        path: root,
      });

      assert.deepEqual(
        skills.map((skill) => ({
          name: skill.name,
          rel: path.relative(root, path.dirname(skill.skillPath)),
        })),
        [
          { name: "browser", rel: "browser" },
          {
            name: "github/_command/commits",
            rel: path.join("github", "_command", "commits"),
          },
          { name: "github/pr", rel: path.join("github", "pr") },
        ]
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

  it("uses nested relative names and skips symlink roots under another root", async () => {
    await withTempDir(async (dir) => {
      const agents = path.join(dir, ".agents", "skills");
      const gpAuth = path.join(agents, "gp", "authentication");
      const cursor = path.join(dir, ".cursor", "skills");
      await mkdir(gpAuth, { recursive: true });
      await mkdir(path.dirname(cursor), { recursive: true });
      await writeFile(path.join(gpAuth, "SKILL.md"), "# Auth\n");
      await symlink(path.join(agents, "gp"), cursor);

      const skills = await discoverSkills([
        { scope: "global", path: agents },
        { scope: "global", path: cursor },
      ]);

      assert.deepEqual(
        skills.map((skill) => ({
          name: skill.name,
          root: path.basename(path.dirname(skill.root)),
        })),
        [{ name: "gp/authentication", root: ".agents" }]
      );
    });
  });

  it("follows directory symlinks when walking nested skill trees", async () => {
    await withTempDir(async (dir) => {
      const root = path.join(dir, ".agents", "skills");
      const realSkill = path.join(dir, "external", "shared-skill");
      await mkdir(realSkill, { recursive: true });
      await mkdir(root, { recursive: true });
      await writeFile(path.join(realSkill, "SKILL.md"), "# Shared\n");
      await symlink(realSkill, path.join(root, "shared-skill"));

      const skills = await discoverSkillsInRoot({
        scope: "global",
        path: root,
      });

      assert.deepEqual(
        skills.map((skill) => skill.name),
        ["shared-skill"]
      );
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

  it("resolves lint targets by skill id under project roots", async () => {
    await withTempDir(async (dir) => {
      const root = path.join(dir, ".agents", "skills");
      const nested = path.join(root, "github", "pr");
      await mkdir(nested, { recursive: true });
      await mkdir(path.join(nested, "references"), { recursive: true });
      await writeFile(
        path.join(nested, "SKILL.md"),
        `---
name: pr
description: Use when opening pull requests.
---
# PR
`
      );
      await writeFile(path.join(nested, "references", "guide.md"), "# Guide\n");

      const byShortName = await resolveLintTargets(["pr"], { cwd: dir });
      assert.deepEqual(
        byShortName.map((file) => path.relative(nested, file)).sort(),
        ["SKILL.md", path.join("references", "guide.md")].sort()
      );

      const byNestedId = await resolveLintTargets(["github/pr"], { cwd: dir });
      assert.deepEqual(byNestedId, byShortName);
    });
  });

  it("reports ambiguous and missing skill ids", async () => {
    await withTempDir(async (dir) => {
      const root = path.join(dir, ".agents", "skills");
      await mkdir(path.join(root, "alpha", "pr"), { recursive: true });
      await mkdir(path.join(root, "beta", "pr"), { recursive: true });
      await writeFile(path.join(root, "alpha", "pr", "SKILL.md"), "# Alpha PR\n");
      await writeFile(path.join(root, "beta", "pr", "SKILL.md"), "# Beta PR\n");

      await assert.rejects(
        () => resolveLintTargets(["pr"], { cwd: dir }),
        /ambiguous skill id "pr"/
      );
      await assert.rejects(
        () => resolveLintTargets(["missing-skill"], { cwd: dir }),
        /skill not found: missing-skill/
      );
    });
  });
});
