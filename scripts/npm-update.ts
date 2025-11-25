#!/usr/bin/env node

import { existsSync } from "fs";
import { fatal, spawnAsync } from "./terminal.ts";

async function main() {
  await updateAllDeps();
}

async function updateAllDeps() {
  if (!existsSync("package.json")) {
    fatal("package.json not found");
  }

  console.log("Checking for outdated dependencies...");
  // npm outdated exits with 1 if there are outdated packages.
  // The output is on stdout. If there is a real error, it will be on stderr.
  const outdatedResult = await spawnAsync("npm outdated --json");

  if (outdatedResult.stderr) {
    fatal(`Error checking for outdated packages: ${outdatedResult.stderr}`);
  }

  const outdated = outdatedResult.stdout;

  if (!outdated) {
    console.log("All dependencies are up to date.");
    return;
  }

  try {
    const outdatedPackages = JSON.parse(outdated);
    const packagesToUpdate = Object.keys(outdatedPackages);

    if (packagesToUpdate.length === 0) {
      console.log("All dependencies are up to date.");
      return;
    }

    console.log("Updating the following packages:");
    console.log(packagesToUpdate.join("\n"));

    const updateArgs = packagesToUpdate.map((pkg) => `${pkg}@latest`);

    await spawnAsync(`npm install ${updateArgs.join(" ")}`, {
      logOutput: true,
    });

    console.log("All dependencies have been updated.");
  } catch (e) {
    fatal(`Failed to parse outdated packages JSON: ${e}`);
  }
}

try {
  await main();
} catch (e) {
  fatal(e);
}
