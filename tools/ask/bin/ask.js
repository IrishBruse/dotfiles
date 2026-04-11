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

/** On Hyprland, force the entry dialog to float (tiled zenity/yad is common otherwise). */
function hyprlandFloatPoller(pid) {
  if (!process.env.HYPRLAND_INSTANCE_SIGNATURE) return () => {};

  let stopped = false;
  const start = Date.now();
  const maxMs = 15_000;
  const interval = setInterval(() => {
    if (stopped) return;
    if (Date.now() - start > maxMs) {
      clearInterval(interval);
      return;
    }
    try {
      const raw = execFileSync("hyprctl", ["clients", "-j"], {
        encoding: "utf8",
        maxBuffer: 10 * 1024 * 1024,
      });
      const clients = JSON.parse(raw);
      const win = clients.find((c) => c.pid === pid);
      if (!win || !win.mapped) return;
      if (win.floating) {
        stopped = true;
        clearInterval(interval);
        return;
      }
      execFileSync("hyprctl", [
        "dispatch",
        "setfloating",
        `address:${win.address}`,
      ]);
      stopped = true;
      clearInterval(interval);
    } catch {
      // hyprctl missing or transient parse error — keep polling briefly
    }
  }, 45);

  return () => {
    stopped = true;
    clearInterval(interval);
  };
}

function spawnEntry(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    let stdout = "";

    const stopFloat = hyprlandFloatPoller(child.pid);

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => {
      stdout += chunk;
    });

    child.on("error", (err) => {
      stopFloat();
      reject(err);
    });

    child.on("close", (code) => {
      stopFloat();
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
