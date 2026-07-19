import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  allSkillRoots,
  discoverSkills,
  displayPath,
  type SkillEntry,
  type SkillRoot,
} from "../discover.ts";
import {
  frontmatterDisplayFields,
  parseSkillFrontmatter,
  type DisplayField,
} from "../frontmatter.ts";
import { paintStdout } from "../lint/color.ts";
import { extractFrontmatter } from "../lint/shared.ts";
import { printHelp } from "./help.ts";

function printError(message: string): void {
  process.stderr.write(`skills: ${message}\n`);
}

function formatDisplayFields(fields: DisplayField[]): string[] {
  if (fields.length === 0) return [];
  const width = Math.max(...fields.map((field) => field.key.length));
  return fields.map(
    (field) =>
      `${paintStdout("dim", field.key.padEnd(width))}  ${field.value}`
  );
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

async function printSkills(skills: SkillEntry[]): Promise<void> {
  const groups = groupSkillsByRoot(skills);
  let firstGroup = true;

  for (const [root, entries] of groups) {
    if (!firstGroup) process.stdout.write("\n");
    firstGroup = false;

    process.stdout.write(
      `${paintStdout("dim", root.scope)} ${paintStdout("label", displayPath(root.path))}\n`
    );
    for (const skill of entries) {
      process.stdout.write(`${paintStdout("ok", skill.name)}\n`);
      const content = await readFile(skill.skillPath, "utf8");
      const frontmatter = extractFrontmatter(content).trim();
      if (!frontmatter) continue;

      const fields = frontmatterDisplayFields(
        parseSkillFrontmatter(frontmatter),
        skill.name
      );
      for (const line of formatDisplayFields(fields)) {
        process.stdout.write(`  ${line}\n`);
      }
    }
  }
}

export async function runLs(argv: string[]): Promise<number> {
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    return 0;
  }

  if (argv.length > 0) {
    for (const arg of argv) {
      if (arg.startsWith("-")) {
        printError(`unknown option ${arg}`);
        printError("Try skills ls --help");
        return 1;
      }
    }
    printError(`unexpected argument: ${argv[0]}`);
    printError("Try skills ls --help");
    return 1;
  }

  const skills = await discoverSkills(allSkillRoots(process.cwd()));
  if (skills.length === 0) {
    printError("no skills found");
    return 1;
  }

  await printSkills(skills);
  return 0;
}
