import process from "node:process";

function fail(message: string): void {
  console.error(message);
  process.exitCode = 1;
}

export function runCreate(args: string[]): void {
  if (args.includes("-h") || args.includes("--help")) {
    console.log("pr create - prepare or open a new pull request for this branch (not implemented)");
    return;
  }

  if (args.length > 0) {
    fail(`pr create: unexpected arguments: ${args.join(" ")}`);
    return;
  }

  fail("pr create: not implemented yet");
}
