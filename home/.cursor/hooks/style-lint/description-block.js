const { extractFrontmatter } = require("./shared");

const DESCRIPTION_BLOCK_SCALAR = /^description:\s*[>|][-+]?(?:\s|$)/m;

function lint(content) {
  const frontmatter = extractFrontmatter(content);
  if (!frontmatter || !DESCRIPTION_BLOCK_SCALAR.test(frontmatter)) return [];
  return [
    "Frontmatter `description` must be a plain YAML string, not a block scalar (`>`, `|`, or variants).",
  ];
}

module.exports = { lint };
