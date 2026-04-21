import { spawn } from "node:child_process";
import process from "node:process";

export function runOpenAgentCapture(
  workspace: string,
  prompt: string,
): Promise<string> {
  const args = [
    "--trust",
    "--workspace",
    workspace,
    "--print",
    prompt,
  ];
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    const child = spawn("agent", args, { cwd: workspace, shell: false });
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      chunks.push(chunk);
      process.stdout.write(chunk);
    });
    child.stderr?.on("data", (chunk: string) => {
      process.stderr.write(chunk);
    });
    child.on("error", (err: NodeJS.ErrnoException) => {
      reject(err);
    });
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`agent killed (${signal})`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`agent exited with code ${code}`));
        return;
      }
      resolve(chunks.join(""));
    });
  });
}
