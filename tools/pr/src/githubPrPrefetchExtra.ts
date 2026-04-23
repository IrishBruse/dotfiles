export type PrRepoCoords = {
  host: string;
  owner: string;
  repo: string;
  number: number;
};

/** Owner/repo/number for the repo that hosts the PR (from canonical PR URL). */
export function prCoordsFromViewPayload(j: {
  number: number;
  url: string;
}): PrRepoCoords {
  let u: URL;
  try {
    u = new URL(j.url);
  } catch {
    throw new Error(`pr-cli: invalid PR url from gh: ${j.url}`);
  }
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 4 || parts[2] !== "pull") {
    throw new Error(`pr-cli: could not parse owner/repo from PR url: ${j.url}`);
  }
  return {
    host: u.origin,
    owner: parts[0]!,
    repo: parts[1]!,
    number: j.number,
  };
}
