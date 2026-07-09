const { MAX_LINE } = require("./shared");

function findLongLines(content) {
  const lines = content.split("\n");
  const long = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("://")) continue;
    if (/^\s*\|/.test(line)) continue;
    if (/^\s*```/.test(line)) continue;
    if (line.length > MAX_LINE) {
      long.push(i + 1);
      if (long.length >= 3) break;
    }
  }
  return long;
}

function lint(content) {
  const long = findLongLines(content);
  if (long.length === 0) return [];
  return [
    `Line(s) over ${MAX_LINE} chars: ${long.join(", ")}. Add a newline after "." instead of one long line.`,
  ];
}

module.exports = { lint };
