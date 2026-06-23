#!/usr/bin/env node

import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function getProjectCommand() {
  const cwd = process.cwd();

  // 1. Node.js / npm projects
  const packageJsonPath = path.join(cwd, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      if (pkg.scripts) {
        // Strict bias: start takes precedence over dev if both exist
        if (pkg.scripts.start) {
          return { cmd: "npm", args: ["run", "start"] };
        }
        if (pkg.scripts.dev) {
          return { cmd: "npm", args: ["run", "dev"] };
        }
      }
    } catch (e) {
      // Fallback if package.json is malformed text
      return { cmd: "npm", args: ["run", "start"] };
    }
  }

  // 2. Go projects
  const goModPath = path.join(cwd, "go.mod");
  if (fs.existsSync(goModPath)) {
    return { cmd: "go", args: ["run", "."] };
  }

  // 3. .NET projects
  const files = fs.readdirSync(cwd);
  const hasCsproj = files.some((file) => file.endsWith(".csproj"));
  if (hasCsproj) {
    return { cmd: "dotnet", args: ["run"] };
  }

  return null;
}

const target = getProjectCommand();

if (!target) {
  console.log(
    "Error: No recognized project files (package.json, go.mod, .csproj) found."
  );
  process.exit(0);
}

// Force terminal colors to pass through directly
const forceColorEnv = {
  ...process.env,
  FORCE_COLOR: "1",
  COLORTERM: "truecolor",
  TERM: process.env.TERM || "xterm-256color",
  DOTNET_SYSTEM_CONSOLE_ALLOW_ANSI_COLOR_REDIRECTION: "1",
  DOTNET_LOGGING__CONSOLE__DISABLETOCOLORS: "false"
};

// Spawn directly into the main terminal standard streams (inherits TTY completely)
const proc = spawn(target.cmd, target.args, {
  shell: true,
  stdio: "inherit",
  env: forceColorEnv
});

proc.on("exit", (code) => {
  process.exit(code || 0);
});

// Pass through interruption signals cleanly
process.on("SIGINT", () => {
  proc.kill("SIGINT");
  process.exit(0);
});
