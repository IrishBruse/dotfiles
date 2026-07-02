import { Link } from "react-router-dom";

import configData from "virtual:github-versions-config";

import {
  commonRepoPrefix,
  deploymentFor,
  formatCompareLabel,
  previewEnv,
  recentPreviewRepos,
  repoShortName,
  type VersionsConfig,
  type VersionsGroupData,
  type RepoVersions
} from "../versions/types.ts";
import { useGithubVersions } from "../versions/useGithubVersions.ts";

const config = configData as VersionsConfig;
const hasConfig = config.groups.length > 0;
const PREVIEW_LIMIT = 3;

function PreviewRow({
  repo,
  group,
  env
}: {
  repo: RepoVersions;
  group: VersionsGroupData;
  env: string;
}) {
  const row = deploymentFor(repo, env);
  if (!row) {
    return null;
  }

  const prefix = commonRepoPrefix(group.repos.map((item) => item.repo));
  const compareLabel = formatCompareLabel(
    config.groups.find((item) => item.id === group.id)?.compare,
    env
  );

  return (
    <li className="versions-list-row">
      <Link
        className="versions-list-repo"
        to={`/versions?group=${group.id}`}
      >
        {repoShortName(repo.repo, prefix)}
      </Link>
      <span className="versions-list-version">{row.version}</span>
      {compareLabel && row.compareUrl ? (
        <a
          className="versions-compare-link"
          href={row.compareUrl}
          target="_blank"
          rel="noreferrer"
        >
          {compareLabel}
        </a>
      ) : compareLabel ? (
        <span className="versions-compare-text">{compareLabel}</span>
      ) : (
        <span />
      )}
      {row.relativeTime && (
        <span className="versions-list-time">{row.relativeTime}</span>
      )}
    </li>
  );
}

export default function GithubVersionsWidget() {
  const { data, loading, fetching, error, refresh } = useGithubVersions({
    enabled: hasConfig
  });

  const firstGroup = data?.groups[0];
  const previewRepos = firstGroup
    ? recentPreviewRepos(firstGroup, PREVIEW_LIMIT)
    : [];
  const previewEnvName = firstGroup ? previewEnv(firstGroup) : "prod";

  if (!hasConfig) {
    return null;
  }

  return (
    <aside
      className="dashboard-versions-widget"
      aria-label="GitHub versions preview"
    >
      <header className="dashboard-versions-widget-header">
        <Link className="dashboard-versions-widget-title" to="/versions">
          Versions
        </Link>
        <button
          type="button"
          className="dashboard-versions-widget-action"
          onClick={() => void refresh()}
          disabled={fetching}
          aria-label="Refresh versions"
          title="Refresh GitHub versions"
        >
          {fetching ? "..." : "Refresh"}
        </button>
      </header>
      {error && (
        <p className="dashboard-versions-widget-error" role="status">
          {error}
        </p>
      )}
      {!error && loading && (
        <p className="dashboard-versions-widget-empty">Fetching versions...</p>
      )}
      {!error && firstGroup && previewRepos.length > 0 && (
        <ul className="versions-list-rows">
          {previewRepos.map((repo) => (
            <PreviewRow
              key={repo.repo}
              repo={repo}
              group={firstGroup}
              env={previewEnvName}
            />
          ))}
        </ul>
      )}
    </aside>
  );
}
