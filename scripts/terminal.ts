const AnsiGray = "\x1b[90m";
const AnsiRed = "\x1b[31m";
const AnsiGreen = "\x1b[32m";
const AnsiYellow = "\x1b[33m";
const AnsiBlue = "\x1b[34m";
const AnsiCyan = "\x1b[36m";

const AnsiReset = "\x1b[0m";
import { ChildProcess, spawn, type SpawnOptions } from "child_process";

export function error(text: string) {
  console.log(`${AnsiRed}${text}${AnsiReset}`);
}

export function fatal(text: string): never {
  error("Fatal: " + text);
  process.exit(1);
}

// export async function $(strings: unknown, ...args: unknown[]): Promise<string> {
//   let cmd = "";
//   for (let i = 0; i < (strings as string[]).length; i++) {
//     cmd += strings[i];
//     if (i < args.length) {
//       cmd += args[i];
//     }
//   }

//   return await exec(cmd);
// }

interface SpawnResult {
  stdout: string;
  stderr: string;
  code: number | null;
  signal: NodeJS.Signals | null;
}

interface AsyncSpawnOptions extends SpawnOptions {
  logOutput?: boolean;
  input?: string;
}

export function spawnAsync(
  commandString: string,
  options: AsyncSpawnOptions = {}
): Promise<SpawnResult> {
  const [command, ...args] = commandString.split(" ");
  return new Promise((resolve, reject) => {
    const { logOutput, input, ...spawnOptions } = options;

    // Default to inheriting stdio if logging is enabled, otherwise pipe to capture it
    // We override this logic if the user explicitly provided stdio options
    if (!spawnOptions.stdio) {
      spawnOptions.stdio = "pipe";
    }

    const child: ChildProcess = spawn(command, args, spawnOptions);

    let stdoutData = "";
    let stderrData = "";

    // Capture stdout
    if (child.stdout) {
      child.stdout.on("data", (data: Buffer) => {
        const str = data.toString();
        stdoutData += str;
        if (logOutput) process.stdout.write(str);
      });
    }

    // Capture stderr
    if (child.stderr) {
      child.stderr.on("data", (data: Buffer) => {
        const str = data.toString();
        stderrData += str;
        if (logOutput) process.stderr.write(str);
      });
    }

    // Write input to stdin if provided
    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }

    // Handle process execution errors (e.g., command not found)
    child.on("error", (err: Error) => {
      reject(
        new Error(
          `Failed to start subprocess: ${commandString}\n${err.message}`
        )
      );
    });

    // Handle process completion
    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      if (code !== 0 && code !== null) {
        // Optional: You could reject here if you want strict success,
        // but often it's better to resolve and let the caller check .code
        // To force throw on non-zero:
        // reject(new Error(`Command failed with code ${code}: ${stderrData || stdoutData}`));
      }

      resolve({
        stdout: stdoutData.trim(),
        stderr: stderrData.trim(),
        code,
        signal,
      });
    });
  });
}
