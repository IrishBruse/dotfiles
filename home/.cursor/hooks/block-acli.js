#!/usr/bin/env node
// beforeShellExecution / preToolUse: block all acli usage.

const BLOCK_MESSAGE =
  "acli is blocked. Use the `jira` or `confluence` CLI, or `jira acli`, instead of bare `acli`. See the atlassian-cli skill.";

function readHookInput() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (err) {
        reject(err);
      }
    });
    process.stdin.on("error", reject);
  });
}

/** True when a shell segment invokes acli as the command. */
function segmentUsesAcli(segment) {
  const trimmed = segment.trim().replace(/^\(+/, "").trim();
  return /^(?:\.\/|\/)?(?:[\w.-]+\/)*acli\b/.test(trimmed);
}

function commandUsesAcli(command) {
  if (!command || typeof command !== "string") return false;
  return command.split(/\s*(?:\|\||&&|\|)\s*/).some(segmentUsesAcli);
}

function shellCommandFromInput(input) {
  if (typeof input.command === "string") return input.command;
  if (input.tool_name === "Shell" && input.tool_input?.command) {
    return input.tool_input.command;
  }
  return "";
}

function deny() {
  process.stdout.write(
    JSON.stringify({
      permission: "deny",
      user_message: BLOCK_MESSAGE,
      agent_message: BLOCK_MESSAGE,
    }),
  );
}

function allow() {
  process.stdout.write(JSON.stringify({ permission: "allow" }));
}

async function main() {
  let input;
  try {
    input = await readHookInput();
  } catch (err) {
    console.error("[block-acli] hook error:", err);
    deny();
    process.exit(2);
    return;
  }

  if (commandUsesAcli(shellCommandFromInput(input))) {
    deny();
    process.exit(2);
    return;
  }

  allow();
}

main();
