import { appendFile, mkdir } from "node:fs/promises";

import { readStdin } from "./args.ts";
import { loadEntries } from "./entries.ts";
import { printOk } from "./output.ts";
import { referencePath, REFERENCES_DIR } from "./paths.ts";
import { writeSkill } from "./renderSkill.ts";
import { parseSlug } from "./slug.ts";

/**
 * Run `memory show <slug> [detail...]`.
 */
export async function runShow(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("Id is required.");
  }

  const [slugRaw, ...detailParts] = args;
  const slug = parseSlug(slugRaw!);
  const stdin = await readStdin();
  const detail = [...detailParts, stdin].filter((part) => part.trim().length > 0);

  if (detail.length === 0) {
    throw new Error("Detail is required as an argument or on stdin.");
  }

  const body = `${detail.join("\n\n").trim()}\n`;
  const filePath = referencePath(slug);
  await mkdir(REFERENCES_DIR, { recursive: true });

  try {
    await appendFile(filePath, body, { flag: "wx" });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      await appendFile(filePath, `\n${body}`, "utf8");
    } else {
      throw err;
    }
  }

  const entries = await loadEntries();
  await writeSkill(entries);

  console.log(filePath);
  printOk(`Wrote reference for ${slug}.`);
}
