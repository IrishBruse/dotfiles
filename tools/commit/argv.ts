export interface CommitOptions {
  help: boolean;
  print: boolean;
}

export function parseCommitArgv(argv: string[]): CommitOptions | "error" {
  const args = argv.slice(2);
  let help = false;
  let print = false;

  for (const arg of args) {
    if (arg === "-h" || arg === "--help") {
      help = true;
      continue;
    }
    if (arg === "--print") {
      print = true;
      continue;
    }
    return "error";
  }

  return { help, print };
}
