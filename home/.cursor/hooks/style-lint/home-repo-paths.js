const { stripCodeSections } = require("./shared");

const HOME_REPO_PATH = /home\/\.(?:agents|cursor)\//g;

function lint(content) {
  const prose = stripCodeSections(content);
  const homePaths = [...prose.matchAll(HOME_REPO_PATH)];
  if (homePaths.length === 0) return [];
  const samples = [...new Set(homePaths.map((m) => m[0]))].slice(0, 3);
  return [
    `Repo path(s) in docs (${samples.join(", ")}). Use runtime paths under ~/, not home/.`,
  ];
}

module.exports = { lint };
