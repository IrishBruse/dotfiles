const { stripCodeSections } = require("./shared");

function findProseSemicolons(text) {
  const prose = stripCodeSections(text);
  const hits = [];
  const re = /[a-zA-Z][\w'']*;\s+[a-z]/g;
  let match;
  while ((match = re.exec(prose)) !== null) {
    const lineStart = prose.lastIndexOf("\n", match.index) + 1;
    const lineEnd = prose.indexOf("\n", match.index);
    const line = prose.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (/https?:\/\//.test(line)) continue;
    if (/^\s*(import|export|const|let|var|function|return|class|interface|type|#include|using)\b/.test(line)) {
      continue;
    }
    hits.push(match[0].trim());
    if (hits.length >= 3) break;
  }
  return hits;
}

function lint(content) {
  const semicolons = findProseSemicolons(content);
  if (semicolons.length === 0) return [];
  return [
    `Prose semicolon(s) ("${semicolons.join('", "')}"). Prefer "," over ";" in English text.`,
  ];
}

module.exports = { lint };
