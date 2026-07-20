import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  allSkillRoots,
  discoverSkills,
  displayPath,
  type SkillEntry,
  type SkillRoot,
} from "../discover.ts";
import { parseSkillFrontmatter, skillDisplay, skillListSortRank } from "../frontmatter.ts";
import { formatSkillLines } from "../ls-format.ts";
import { paintStdout } from "../rules/engine/color.ts";
import { extractFrontmatter } from "../rules/core/shared.ts";
import { parseSkillsArgs } from "./argv.ts";
import { printHelp } from "./help.ts";

function printError(message: string): void {
  process.stderr.write(`skills: ${message}\n`);
}

function groupSkillsByRoot(skills: SkillEntry[]): Map<SkillRoot, SkillEntry[]> {
  const groups = new Map<string, { root: SkillRoot; skills: SkillEntry[] }>();

  for (const skill of skills) {
    const key = `${skill.scope}\0${skill.root}`;
    let group = groups.get(key);
    if (!group) {
      group = { root: { scope: skill.scope, path: skill.root }, skills: [] };
      groups.set(key, group);
    }
    group.skills.push(skill);
  }

  const ordered = [...groups.values()].sort((a, b) => {
    if (a.root.scope !== b.root.scope) {
      return a.root.scope === "global" ? -1 : 1;
    }
    return a.root.path.localeCompare(b.root.path);
  });

  return new Map(ordered.map((group) => [group.root, group.skills]));
}

interface SkillLsEntry {
  skill: SkillEntry;
  display: ReturnType<typeof skillDisplay>;
}

async function loadSkillEntries(skills: SkillEntry[]): Promise<SkillLsEntry[]> {
  return Promise.all(
    skills.map(async (skill) => {
      const content = await readFile(skill.skillPath, "utf8");
      const frontmatter = extractFrontmatter(content).trim();
      const parsed = frontmatter
        ? parseSkillFrontmatter(frontmatter)
        : { entries: [] };
      return {
        skill,
        display: frontmatter ? skillDisplay(parsed, skill.name) : { headingTags: [], fields: [] },
        rank: skillListSortRank(parsed),
      };
    })
  );
}

function sortSkillEntries(
  entries: Awaited<ReturnType<typeof loadSkillEntries>>
): SkillLsEntry[] {
  return [...entries]
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return a.skill.name.localeCompare(b.skill.name);
    })
    .map(({ skill, display }) => ({ skill, display }));
}

async function printSkills(skills: SkillEntry[]): Promise<void> {
  const groups = groupSkillsByRoot(skills);
  let firstGroup = true;

  for (const [root, entries] of groups) {
    if (!firstGroup) process.stdout.write("\n");
    firstGroup = false;

    process.stdout.write(
      `${paintStdout("warn", displayPath(root.path))} ${paintStdout("label", root.scope)}\n\n`
    );

    let index = 0;
    for (const { skill, display } of sortSkillEntries(
      await loadSkillEntries(entries)
    )) {
      if (index > 0) process.stdout.write("\n");
      index++;

      for (const line of formatSkillLines(display, skill.name)) {
        process.stdout.write(`${line}\n`);
      }
    }
  }
}

export async function runLs(argv: string[]): Promise<number> {
  const parsed = parseSkillsArgs(argv);
  if (parsed === "help") {
    printHelp();
    return 0;
  }
  if (parsed === "error") {
    printError("unknown option");
    printError("Try skills ls --help");
    return 1;
  }

  if (parsed.positional.length > 0) {
    printError(`unexpected argument: ${parsed.positional[0]}`);
    printError("Try skills ls --help");
    return 1;
  }

  const skills = await discoverSkills(
    allSkillRoots(process.cwd(), {
      includeCursorBuiltin: parsed.cursorBuiltin,
    })
  );
  if (skills.length === 0) {
    printError("no skills found");
    return 1;
  }

  await printSkills(skills);
  return 0;
}
