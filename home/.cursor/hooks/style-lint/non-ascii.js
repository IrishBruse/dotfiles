const { stripCodeSections } = require("./shared");

function findNonAscii(text) {
  const prose = stripCodeSections(text);
  const hits = [];
  const lines = prose.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch.codePointAt(0) > 127) {
        hits.push({ line: i + 1, ch });
        break;
      }
    }
    if (hits.length >= 3) break;
  }
  return hits;
}

function lint(content) {
  const nonAscii = findNonAscii(content);
  if (nonAscii.length === 0) return [];
  const detail = nonAscii
    .map(({ line, ch }) => `line ${line} (${JSON.stringify(ch)})`)
    .join(", ");
  return [
    `Non-ASCII character(s): ${detail}. Use plain ASCII (no emoji or Unicode punctuation).`,
  ];
}

module.exports = { lint };
