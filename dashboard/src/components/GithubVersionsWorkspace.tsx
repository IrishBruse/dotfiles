import { useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import configData from "virtual:github-versions-config";

import {
  type DeploymentRow,
  type InfoRepoVersions,
  type RepoVersions,
  type VersionsConfig,
  type VersionsGroupData,
  formatCompareLabel
} from "../versions/types.ts";
import { useGithubVersions } from "../versions/useGithubVersions.ts";

const config = configData as VersionsConfig;
const hasConfig = config.groups.length > 0;

function envClass(env: string): string {
  return `versions-env-${env}`;
}

function GroupTabs({
  groups,
  activeId,
  onSelect
}: {
  groups: VersionsGroupData[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      className="versions-tabs"
      role="tablist"
      aria-label="Version groups"
    >
      {groups.map((group) => {
        const active = group.id === activeId;
        return (
          <button
            key={group.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`versions-tab${active ? " is-active" : ""}`}
            onClick={() => onSelect(group.id)}
          >
            {group.label}
          </button>
        );
      })}
    </div>
  );
}

function DeploymentLine({
  row,
  compare
}: {
  row: DeploymentRow;
  compare?: Record<string, string>;
}) {
  const pr = row.prNumber ? (
    <a
      className="versions-pr-link"
      href={row.prUrl ?? undefined}
      target="_blank"
      rel="noreferrer"
    >
      #{row.prNumber}
    </a>
  ) : (
    <span className="versions-pr-empty">----</span>
  );

  const version = (
    <span className="versions-version-text">{row.version}</span>
  );

  const compareLabel = formatCompareLabel(compare, row.env);

  const compareLink =
    compareLabel && row.compareUrl ? (
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
    ) : null;

  return (
    <div className="versions-env-line">
      <span className={`versions-env-label ${envClass(row.env)}`}>
        {row.env}:
      </span>
      <span className="versions-env-pr">{pr}</span>
      <span className="versions-env-version">
        {version}
        {compareLink}
      </span>
      {row.relativeTime && (
        <span className="versions-env-time">{row.relativeTime}</span>
      )}
    </div>
  );
}

function RepoBlock({
  repo,
  org,
  environments,
  compare
}: {
  repo: RepoVersions;
  org: string;
  environments: string[];
  compare?: Record<string, string>;
}) {
  return (
    <section className="versions-repo-block">
      <h2 className="versions-repo-name">
        <a
          href={`https://github.com/${org}/${repo.repo}`}
          target="_blank"
          rel="noreferrer"
        >
          {repo.repo}
        </a>
      </h2>
      {environments.map((env) => {
        const row = repo.deployments.find((item) => item.env === env);
        if (!row) {
          return null;
        }
        return <DeploymentLine key={env} row={row} compare={compare} />;
      })}
    </section>
  );
}

function InfoRepoBlock({
  info,
  org
}: {
  info: InfoRepoVersions;
  org: string;
}) {
  return (
    <section className="versions-repo-block">
      <h2 className="versions-repo-name">
        <a
          href={`https://github.com/${org}/${info.repo}`}
          target="_blank"
          rel="noreferrer"
        >
          {info.repo}
        </a>
      </h2>
      {info.rows.map((row) => (
        <div key={row.label} className="versions-env-line">
          <span className="versions-env-label">{row.label}:</span>
          <span className="versions-env-version">{row.value}</span>
        </div>
      ))}
    </section>
  );
}

export default function GithubVersionsWorkspace() {
  const { data, loading, fetching, error, refresh } = useGithubVersions({
    enabled: hasConfig
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const groupParam = searchParams.get("group");

  const groups = data?.groups ?? [];
  const activeId = useMemo(() => {
    if (groups.length === 0) {
      return config.groups[0]?.id ?? "";
    }
    if (groupParam && groups.some((group) => group.id === groupParam)) {
      return groupParam;
    }
    return groups[0]!.id;
  }, [groups, groupParam]);

  const activeGroup = groups.find((group) => group.id === activeId);
  const activeCompare = config.groups.find(
    (group) => group.id === activeId
  )?.compare;

  useEffect(() => {
    if (!activeGroup || activeGroup.id === groupParam) {
      return;
    }
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.set("group", activeGroup.id);
        return next;
      },
      { replace: true }
    );
  }, [activeGroup, groupParam, setSearchParams]);

  function selectGroup(id: string): void {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params);
        next.set("group", id);
        return next;
      },
      { replace: true }
    );
  }

  return (
    <section className="versions-workspace" aria-label="GitHub versions">
      <header className="versions-workspace-header">
        <h1 className="versions-workspace-title">GitHub versions</h1>
        <button
          type="button"
          className="versions-workspace-action"
          onClick={() => void refresh()}
          disabled={!hasConfig || fetching}
        >
          {fetching ? "Fetching..." : "Refresh"}
        </button>
      </header>
      {groups.length > 0 && (
        <GroupTabs
          groups={groups}
          activeId={activeId}
          onSelect={selectGroup}
        />
      )}
      {error && (
        <p className="versions-workspace-error" role="status">
          {error}
        </p>
      )}
      {!hasConfig && (
        <p className="versions-workspace-empty">
          No version groups configured. Add <code>dashboard/github-versions.json</code>{" "}
          to enable this page.
        </p>
      )}
      {hasConfig && !error && loading && (
        <p className="versions-workspace-empty">Fetching versions...</p>
      )}
      {hasConfig && !error && activeGroup && (
        <div className="versions-workspace-body">
          {activeGroup.repos.map((repo) => (
            <RepoBlock
              key={repo.repo}
              repo={repo}
              org={activeGroup.org}
              environments={activeGroup.environments}
              compare={activeCompare}
            />
          ))}
          {activeGroup.infoRepos.map((info) => (
            <InfoRepoBlock key={info.repo} info={info} org={activeGroup.org} />
          ))}
          {data && (
            <p className="versions-workspace-meta">
              Updated {new Date(data.fetchedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
