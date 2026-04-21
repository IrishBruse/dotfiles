export function runCreate(args: string[]): void {
  console.log("pr create: running (skeleton)");
  if (args.length > 0) {
    console.log("pr create: extra args (ignored for now):", args.join(" "));
  }
}
