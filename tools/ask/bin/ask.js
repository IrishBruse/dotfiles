#!/usr/bin/env node
import { execFileSync, spawn } from "node:child_process";

function usage() {
  console.error("usage: ask <question>");
  process.exit(2);
}

function printAnswer(text) {
  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`);
}

function askDarwin(question) {
  /** Prompt via argv (-- …) so the script stays fixed; no JXA or JSON-in-script. */
  const out = execFileSync(
    "osascript",
    [
      "-e",
      `on run argv
\tset q to item 1 of argv
\tset r to display dialog q default answer "" with title "ask" buttons {"Cancel", "OK"} default button "OK"
\treturn text returned of r
end run`,
      "--",
      question,
    ],
    { encoding: "utf8" },
  );
  return out.replace(/\n$/, "");
}

function spawnEntry(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stdout = "";

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.replace(/\n$/, ""));
      } else {
        resolve(null);
      }
    });
  });
}

async function askLinux(question) {
  const attempts = [
    ["zenity", ["--entry", "--title=ask", "--text", question]],
    ["kdialog", ["--title", "ask", "--inputbox", question, ""]],
    ["yad", ["--entry", "--title=ask", "--text", question]],
  ];

  for (const [cmd, args] of attempts) {
    try {
      const text = await spawnEntry(cmd, args);
      if (text !== null) return text;
      process.exit(1);
    } catch (e) {
      if (e && e.code === "ENOENT") continue;
      throw e;
    }
  }

  console.error(
    "ask: no GUI helper found (tried zenity, kdialog, yad). Install one, e.g. apt install zenity",
  );
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();

  const question = argv.join(" ");

  try {
    let text;
    if (process.platform === "darwin") {
      text = askDarwin(question);
    } else if (process.platform === "linux") {
      text = await askLinux(question);
    } else {
      console.error("ask: unsupported platform (use macOS or Linux)");
      process.exit(1);
    }
    printAnswer(text);
  } catch {
    process.exit(1);
  }
}

await main();
