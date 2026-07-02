import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { Connect } from "vite";
import type { Plugin, ViteDevServer } from "vite";

const execFileAsync = promisify(execFile);

const VIRTUAL_CONFIG_ID = "virtual:github-versions-config";
const RESOLVED_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`;

export type InfoRepoRowConfig =
  | { label: string; kind: "latestRelease" }
  | { label: string; kind: "workflowBranch"; workflow: string };

export type VersionsGroupConfig = {
  id: string;
  label: string;
  org: string;
  environments: string[];
  devVersionFromRelease?: boolean;
  compare?: Record<string, string>;
  repos: string[];
  infoRepos?: {
    repo: string;
    rows: InfoRepoRowConfig[];
  }[];
};

export type VersionsConfig = {
  groups: VersionsGroupConfig[];
};

export type DeploymentRow = {
  env: string;
  prNumber: number | null;
  version: string;
  relativeTime: string;
  updatedAt: string;
  ref: string;
  prUrl: string | null;
  compareLabel: string | null;
  compareUrl: string | null;
};

export type RepoVersions = {
  repo: string;
  deployments: DeploymentRow[];
};

export type InfoRepoRow = {
  label: string;
  value: string;
};

export type InfoRepoVersions = {
  repo: string;
  rows: InfoRepoRow[];
};

export type VersionsGroupData = {
  id: string;
  label: string;
  org: string;
  environments: string[];
  repos: RepoVersions[];
  infoRepos: InfoRepoVersions[];
};

export type VersionsData = {
  groups: VersionsGroupData[];
  fetchedAt: string;
};

function configPath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "github-versions.json"
  );
}

function cachePath(): string {
  return path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "github-versions.cache.json"
  );
}

type VersionsCacheEntry = {
  configHash: string;
  data: VersionsData;
};

function hashConfig(config: VersionsConfig): string {
  return JSON.stringify(config.groups);
}

function readDiskCache(): VersionsCacheEntry | null {
  const file = cachePath();
  if (!existsSync(file)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as VersionsCacheEntry;
    if (
      parsed?.configHash &&
      parsed.data?.groups &&
      parsed.data.fetchedAt
    ) {
      return parsed;
    }
  } catch {
    // Ignore invalid cache files.
  }
  return null;
}

function writeDiskCache(entry: VersionsCacheEntry): void {
  try {
    writeFileSync(cachePath(), JSON.stringify(entry), "utf8");
  } catch {
    // Cache is optional; fetches still work without disk persistence.
  }
}

let memoryCache: VersionsCacheEntry | null = null;

function cachedVersions(config: VersionsConfig): VersionsData | null {
  const hash = hashConfig(config);
  if (memoryCache?.configHash === hash) {
    return memoryCache.data;
  }
  const disk = readDiskCache();
  if (disk?.configHash === hash) {
    memoryCache = disk;
    return disk.data;
  }
  return null;
}

function storeVersionsCache(config: VersionsConfig, data: VersionsData): void {
  const entry = { configHash: hashConfig(config), data };
  memoryCache = entry;
  writeDiskCache(entry);
}

function clearVersionsCache(): void {
  memoryCache = null;
}

const EMPTY_CONFIG: VersionsConfig = { groups: [] };

export function loadVersionsConfig(): VersionsConfig {
  const file = configPath();
  if (!existsSync(file)) {
    return EMPTY_CONFIG;
  }
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as VersionsConfig).groups)
    ) {
      return parsed as VersionsConfig;
    }
  } catch {
    // Invalid or unreadable config falls back to empty groups.
  }
  return EMPTY_CONFIG;
}

function timeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInMs = now.getTime() - past.getTime();

  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (seconds < 60) {
    return rtf.format(-seconds, "second");
  }
  if (minutes < 60) {
    return rtf.format(-minutes, "minute");
  }
  if (hours < 24) {
    return rtf.format(-hours, "hour");
  }
  if (days < 7) {
    return rtf.format(-days, "day");
  }
  if (weeks < 4) {
    return rtf.format(-weeks, "week");
  }
  if (months < 12) {
    return rtf.format(-months, "month");
  }
  return rtf.format(-years, "year");
}

async function ghApi(jq: string, resource: string): Promise<string> {
  const { stdout } = await execFileAsync(
    "gh",
    ["api", resource, "--jq", jq],
    { timeout: 30_000 }
  );
  return stdout.trim();
}

type EnvResult = {
  prNumber: number | null;
  version: string;
  relativeTime: string;
  updatedAt: string;
  ref: string;
};

async function getPrFromRef(
  org: string,
  repo: string,
  ref: string
): Promise<number | null> {
  try {
    const pr = await ghApi(
      ".[0].number",
      `repos/${org}/${repo}/commits/${ref}/pulls`
    );
    if (!pr) {
      return null;
    }
    const prId = Number.parseInt(pr, 10);
    return Number.isFinite(prId) ? prId : null;
  } catch {
    return null;
  }
}

async function getVersionAndPr(
  org: string,
  repo: string,
  env: string,
  devVersionFromRelease: boolean
): Promise<EnvResult> {
  const repoUrl = `repos/${org}/${repo}`;
  const url = `${repoUrl}/deployments?per_page=1&direction=desc&environment=${env}`;
  const json = await ghApi(".[0]", url);
  if (!json) {
    return {
      prNumber: null,
      version: "unknown",
      relativeTime: "",
      updatedAt: "",
      ref: ""
    };
  }

  const api = JSON.parse(json) as { ref: string; updated_at: string };
  const ref = api.ref;
  let version = ref;

  const prNumber = await getPrFromRef(org, repo, ref);

  if (devVersionFromRelease && env === "dev") {
    version = await ghApi(".tag_name", `${repoUrl}/releases/latest`);
  }

  return {
    prNumber,
    version,
    relativeTime: timeAgo(api.updated_at),
    updatedAt: api.updated_at,
    ref
  };
}

function compareUrl(
  org: string,
  repo: string,
  group: VersionsGroupConfig,
  env: string,
  currentRef: string,
  byEnv: Map<string, EnvResult>
): string | null {
  const target = group.compare?.[env];
  if (!target || !currentRef) {
    return null;
  }
  if (target === "main") {
    return `https://github.com/${org}/${repo}/compare/${currentRef}...main`;
  }
  const other = byEnv.get(target);
  if (!other?.ref) {
    return null;
  }
  return `https://github.com/${org}/${repo}/compare/${other.ref}...${currentRef}`;
}

function compareLabel(
  group: VersionsGroupConfig,
  env: string,
  currentRef: string,
  byEnv: Map<string, EnvResult>
): string | null {
  const target = group.compare?.[env];
  if (!target || !currentRef) {
    return null;
  }
  if (target !== "main" && !byEnv.get(target)?.ref) {
    return null;
  }
  return `${target}...${env}`;
}

async function githubEnvVersions(
  group: VersionsGroupConfig,
  repo: string
): Promise<RepoVersions> {
  const results = await Promise.all(
    group.environments.map((env) =>
      getVersionAndPr(
        group.org,
        repo,
        env,
        group.devVersionFromRelease === true
      )
    )
  );

  const byEnv = new Map(
    group.environments.map((env, index) => [env, results[index]!])
  );

  return {
    repo,
    deployments: group.environments.map((env) => {
      const info = byEnv.get(env)!;
      const prUrl = info.prNumber
        ? `https://github.com/${group.org}/${repo}/pull/${info.prNumber}`
        : null;
      return {
        env,
        prNumber: info.prNumber,
        version:
          info.ref === "" && info.version === "unknown"
            ? "unknown"
            : info.version,
        relativeTime: info.relativeTime,
        updatedAt: info.updatedAt,
        ref: info.ref,
        prUrl,
        compareLabel: compareLabel(group, env, info.ref, byEnv),
        compareUrl: compareUrl(
          group.org,
          repo,
          group,
          env,
          info.ref,
          byEnv
        )
      };
    })
  };
}

async function fetchInfoRepo(
  org: string,
  config: NonNullable<VersionsGroupConfig["infoRepos"]>[number]
): Promise<InfoRepoVersions> {
  const repoUrl = `repos/${org}/${config.repo}`;
  const rows = await Promise.all(
    config.rows.map(async (row) => {
      if (row.kind === "latestRelease") {
        const value = await ghApi(".tag_name", `${repoUrl}/releases/latest`);
        return { label: row.label, value };
      }
      const value = await ghApi(
        ".workflow_runs.[0].head_branch",
        `${repoUrl}/actions/workflows/${row.workflow}/runs`
      );
      return { label: row.label, value };
    })
  );
  return { repo: config.repo, rows };
}

async function fetchGroupVersions(
  group: VersionsGroupConfig
): Promise<VersionsGroupData> {
  const [repos, infoRepos] = await Promise.all([
    Promise.all(group.repos.map((repo) => githubEnvVersions(group, repo))),
    Promise.all((group.infoRepos ?? []).map((item) => fetchInfoRepo(group.org, item)))
  ]);

  return {
    id: group.id,
    label: group.label,
    org: group.org,
    environments: group.environments,
    repos,
    infoRepos
  };
}

/** Fetch deployed GitHub Environment versions for configured repo groups. */
export async function fetchGithubVersions(
  config: VersionsConfig = loadVersionsConfig()
): Promise<VersionsData> {
  if (config.groups.length === 0) {
    return {
      groups: [],
      fetchedAt: new Date().toISOString()
    };
  }
  const groups = await Promise.all(
    config.groups.map((group) => fetchGroupVersions(group))
  );
  return {
    groups,
    fetchedAt: new Date().toISOString()
  };
}

let inFlight: Promise<VersionsData> | null = null;

async function getGithubVersions(force: boolean): Promise<VersionsData> {
  const config = loadVersionsConfig();
  if (config.groups.length === 0) {
    return {
      groups: [],
      fetchedAt: new Date().toISOString()
    };
  }

  if (!force) {
    const cached = cachedVersions(config);
    if (cached) {
      return cached;
    }
    if (inFlight) {
      return inFlight;
    }
  } else if (inFlight) {
    await inFlight.catch(() => undefined);
  }

  inFlight = fetchGithubVersions(config)
      .then((data) => {
        storeVersionsCache(config, data);
        return data;
      })
      .finally(() => {
        inFlight = null;
      });
  return inFlight;
}

function versionsMiddleware(): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/api/github-versions") {
      next();
      return;
    }
    if (req.method !== "GET" && req.method !== "POST") {
      next();
      return;
    }

    res.setHeader("Content-Type", "application/json");

    void (async () => {
      try {
        const force = req.method === "POST";
        const data = await getGithubVersions(force);
        res.end(JSON.stringify({ ok: true, ...data }));
      } catch (error) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            ok: false,
            error:
              error instanceof Error ? error.message : "Version fetch failed"
          })
        );
      }
    })();
  };
}

function configModuleSource(): string {
  return `export default ${JSON.stringify(loadVersionsConfig())}`;
}

function reloadConfigModule(server: ViteDevServer): void {
  const mod = server.moduleGraph.getModuleById(RESOLVED_CONFIG_ID);
  if (mod) {
    server.reloadModule(mod);
  }
}

/** Dev-server middleware and config module for GitHub env versions. */
export function githubVersions(): Plugin {
  return {
    name: "github-versions",
    resolveId(id) {
      if (id === VIRTUAL_CONFIG_ID) {
        return RESOLVED_CONFIG_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_CONFIG_ID) {
        return configModuleSource();
      }
    },
    configureServer(server) {
      const file = configPath();
      if (existsSync(file)) {
        server.watcher.add(file);
      }
      server.middlewares.use(versionsMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(versionsMiddleware());
    },
    handleHotUpdate({ file, server }) {
      if (path.normalize(file) !== path.normalize(configPath())) {
        return;
      }
      clearVersionsCache();
      reloadConfigModule(server);
    }
  };
}
