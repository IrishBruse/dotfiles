import process from "node:process";

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
  console.log("pr review: running (skeleton) for:", target);
}
