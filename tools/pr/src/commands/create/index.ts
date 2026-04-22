import { loadCreateAgentPrompt } from "./createPrompt.ts";

export function runCreate(args: string[]): void {
  if (args.length > 0) {
    console.log("pr create: extra args (ignored for now):", args.join(" "));
  }

  const prompt = loadCreateAgentPrompt();
  console.error(
    `pr create: stub — composed agent prompt (${prompt.length} chars); not invoking agent yet`,
  );
}
