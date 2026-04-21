import process from "node:process";

import {
  buildJiraBlockFromEnv,
  buildPrLine,
  loadReviewAgentPrompt,
} from "./reviewPrompt.ts";

export function runReview(args: string[]): void {
  const target = args[0];
  if (target === undefined) {
    console.error("pr review: expected a pull request URL or number");
    process.exitCode = 1;
    return;
  }
  if (args.length > 1) {
    console.log("pr review: extra args (ignored):", args.slice(1).join(" "));
  }

  const prompt = loadReviewAgentPrompt({
    prLine: buildPrLine(target),
    hintBlock: "",
    jiraBlock: buildJiraBlockFromEnv(),
  });

  // Stub: compose shared + review prompts; wire `agent --print` + JSON parse + TTY approve next.
  console.error(
    `pr review: stub — composed agent prompt (${prompt.length} chars) for ${target}; not invoking agent yet`,
  );
}
