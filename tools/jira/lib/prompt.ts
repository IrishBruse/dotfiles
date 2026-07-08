import readline from "node:readline";
import process from "node:process";

/** Ask a y/N (default No) or Y/n question on a TTY. */
export function confirm(question: string, defaultNo = true): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.resolve(false);
  }
  const suffix = defaultNo ? " [y/N] " : " [Y/n] ";
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question(`${question}${suffix}`, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (!trimmed) {
        resolve(!defaultNo);
        return;
      }
      resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}
