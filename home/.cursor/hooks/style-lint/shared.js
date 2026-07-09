const MAX_LINE = 160;

function stripCodeSections(text) {
  let result = text.replace(/```[\s\S]*?```/g, "");
  result = result.replace(/`[^`\n]+`/g, "");
  return result;
}

function extractFrontmatter(content) {
  if (!content.startsWith("---")) return "";
  const end = content.indexOf("\n---", 3);
  if (end === -1) return "";
  return content.slice(3, end);
}

module.exports = {
  MAX_LINE,
  stripCodeSections,
  extractFrontmatter,
};
