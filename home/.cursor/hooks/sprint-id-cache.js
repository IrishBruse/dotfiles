#!/usr/bin/env node
// sessionStart hook: cache NOVACORE sprint id (customfield_10021) once per day.

const { spawnSync } = require("node:child_process");
const { mkdir, readFile, writeFile } = require("node:fs/promises");
const { homedir } = require("node:os");
const { join } = require("node:path");

const ACLI = "acli";
const JQL =
  "project = NOVACORE AND sprint in openSprints() AND cf[10354] = 16409 ORDER BY updated DESC";
const SPRINT_FIELD = "customfield_10021";
const CACHE_PATH = join(homedir(), ".cursor", "cache", "novacore-sprint-id.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ENV_KEY = "NOVACORE_SPRINT_ID";

function noop() {
  process.stdout.write("{}");
}

function isTruthyEnv(name) {
  const v = (process.env[name] ?? "").trim();
  if (v === "" || v === "0" || v.toLowerCase() === "false") return false;
  return true;
}

function runAcli(args) {
  const result = spawnSync(ACLI, args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `acli exit ${result.status}`);
  }
  return (result.stdout || "").trim();
}

function parseJson(stdout) {
  if (!stdout) return null;
  return JSON.parse(stdout);
}

function issueKeyFromSearch(data) {
  const items = Array.isArray(data) ? data : data ? [data] : [];
  for (const item of items) {
    if (item && typeof item.key === "string" && item.key) {
      return item.key;
    }
  }
  return null;
}

function sprintFromView(data) {
  const sprints = data?.fields?.[SPRINT_FIELD];
  if (!Array.isArray(sprints) || sprints.length === 0) return null;
  const sprint = sprints.find((s) => s?.state === "active") ?? sprints[0];
  if (!sprint || sprint.id == null) return null;
  return {
    id: String(sprint.id),
    name: typeof sprint.name === "string" ? sprint.name : "",
  };
}

async function readCache() {
  try {
    const raw = await readFile(CACHE_PATH, "utf8");
    const cache = JSON.parse(raw);
    if (!cache || typeof cache.fetchedAt !== "number" || !cache.sprintId) {
      return null;
    }
    if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) {
      return null;
    }
    return cache;
  } catch {
    return null;
  }
}

async function writeCache(entry) {
  await mkdir(join(homedir(), ".cursor", "cache"), { recursive: true });
  await writeFile(CACHE_PATH, `${JSON.stringify(entry)}\n`, "utf8");
}

async function fetchSprintFromJira() {
  const searchStdout = runAcli([
    "jira",
    "workitem",
    "search",
    "--jql",
    JQL,
    "--fields",
    "key,summary",
    "--limit",
    "1",
    "--json",
  ]);
  const key = issueKeyFromSearch(parseJson(searchStdout));
  if (!key) return null;

  const viewStdout = runAcli([
    "jira",
    "workitem",
    "view",
    key,
    "--fields",
    SPRINT_FIELD,
    "--json",
  ]);
  const sprint = sprintFromView(parseJson(viewStdout));
  if (!sprint) return null;

  return { sprint, sourceKey: key };
}

function output(cache) {
  const line = cache.sprintName
    ? `NOVACORE open sprint ${SPRINT_FIELD} id: ${cache.sprintId} (${cache.sprintName}).`
    : `NOVACORE open sprint ${SPRINT_FIELD} id: ${cache.sprintId}.`;

  process.stdout.write(
    JSON.stringify({
      additional_context: line,
      env: { [ENV_KEY]: cache.sprintId },
    }),
  );
}

async function drainStdin() {
  await new Promise((resolve) => {
    const chunks = [];
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", resolve);
    process.stdin.on("error", resolve);
    if (process.stdin.readableEnded) resolve();
  });
}

async function main() {
  await drainStdin();

  if (!isTruthyEnv("WORK")) {
    noop();
    return;
  }

  if (!spawnSync("command", ["-v", ACLI], { encoding: "utf8" }).stdout?.trim()) {
    noop();
    return;
  }

  try {
    let cache = await readCache();
    if (!cache) {
      const live = await fetchSprintFromJira();
      if (!live) {
        noop();
        return;
      }
      cache = {
        fetchedAt: Date.now(),
        sprintId: live.sprint.id,
        sprintName: live.sprint.name,
        sourceKey: live.sourceKey,
      };
      await writeCache(cache);
    }

    output(cache);
  } catch (err) {
    console.error("[sprint-id-cache] hook error:", err);
    noop();
  }
}

main();
