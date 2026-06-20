import { appendEntry } from "./entries.ts";
import { writeSkill } from "./renderSkill.ts";
import { parseSlug } from "./slug.ts";

/** Max inline sentence length; use `memory ref` for longer detail. */
export const MAX_ENTRY_LENGTH = 120;

/**
 * Run `memory add <id> <sentence>`.
 */
export async function runAdd(args: string[]): Promise<void> {
  if (args.length < 2) {
    throw new Error("memory add: id and sentence are required");
  }

  const [idRaw, ...sentenceParts] = args;
  const ref = parseSlug(idRaw!);
  const text = sentenceParts.join(" ").trim();

  if (!text) {
    throw new Error("memory add: sentence is required");
  }
  if (text.includes("\n")) {
    throw new Error("memory add: sentence must be a single line");
  }
  if (text.length > MAX_ENTRY_LENGTH) {
    throw new Error(
      `memory add: sentence too long (${text.length} chars, max ${MAX_ENTRY_LENGTH}); keep one line in the skill and use memory ref for detail`
    );
  }

  const { entries, added } = await appendEntry({ text, ref });
  await writeSkill(entries);

  if (!added) {
    throw new Error(`memory add: id already exists: ${ref}`);
  }

  console.error("memory: added entry");
}
