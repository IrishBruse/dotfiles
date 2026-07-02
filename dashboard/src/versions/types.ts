import type {
  DeploymentRow,
  InfoRepoVersions,
  RepoVersions,
  VersionsConfig,
  VersionsData,
  VersionsGroupData
} from "../../github-versions.ts";

export type {
  DeploymentRow,
  InfoRepoVersions,
  RepoVersions,
  VersionsConfig,
  VersionsData,
  VersionsGroupData
};

export function deploymentFor(
  repo: RepoVersions,
  env: string
): DeploymentRow | undefined {
  return repo.deployments.find((row) => row.env === env);
}

export function groupById(
  data: VersionsData,
  id: string
): VersionsGroupData | undefined {
  return data.groups.find((group) => group.id === id);
}

export function formatCompareLabel(
  compare: Record<string, string> | undefined,
  env: string
): string | null {
  const target = compare?.[env];
  if (!target) {
    return null;
  }
  return `${target}...${env}`;
}

export function previewEnv(group: VersionsGroupData): string {
  return group.environments.includes("prod")
    ? "prod"
    : group.environments.at(-1) ?? "prod";
}

export function recentPreviewRepos(
  group: VersionsGroupData,
  limit: number
): RepoVersions[] {
  const env = previewEnv(group);
  return [...group.repos]
    .sort((left, right) => {
      const leftMs = Date.parse(deploymentFor(left, env)?.updatedAt ?? "");
      const rightMs = Date.parse(deploymentFor(right, env)?.updatedAt ?? "");
      const leftSort = Number.isFinite(leftMs) ? leftMs : 0;
      const rightSort = Number.isFinite(rightMs) ? rightMs : 0;
      return rightSort - leftSort;
    })
    .slice(0, limit);
}

export function repoShortName(repo: string, prefix?: string): string {
  if (prefix && repo.startsWith(prefix)) {
    return repo.slice(prefix.length);
  }
  const parts = repo.split("-");
  if (parts.length > 2) {
    return parts.slice(2).join("-") || repo;
  }
  return repo;
}

export function commonRepoPrefix(repos: string[]): string | undefined {
  if (repos.length < 2) {
    return undefined;
  }
  const split = repos.map((repo) => repo.split("-"));
  const prefix: string[] = [];
  for (let index = 0; index < split[0]!.length; index++) {
    const part = split[0]![index];
    if (!part || !split.every((parts) => parts[index] === part)) {
      break;
    }
    prefix.push(part);
  }
  if (prefix.length < 2) {
    return undefined;
  }
  return `${prefix.join("-")}-`;
}
