import { appendFile, mkdir } from "node:fs/promises";

import { readStdin } from "./args.ts";
import { loadEntries } from "./entries.ts";
import { referencePath, REFERENCES_DIR } from "./paths.ts";
import { writeSkill } from "./renderSkill.ts";
import { parseSlug } from "./slug.ts";

/**
 * Run `memory ref <slug> [detail...]`.
 */
export async function runRef(args: string[]): Promise<void> {
  if (args.length === 0) {
    throw new Error("memory ref: slug is required");
  }

  const [slugRaw, ...detailParts] = args;
  const slug = parseSlug(slugRaw!);
  const stdin = await readStdin();
  const detail = [...detailParts, stdin].filter((part) => part.trim().length > 0);

  if (detail.length === 0) {
    throw new Error("memory ref: detail is required (argument or stdin)");
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
  console.error(`memory: wrote reference ${slug}`);
}
