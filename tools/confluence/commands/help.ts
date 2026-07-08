import process from "node:process";

export function printHelp(): void {
  process.stdout.write(`Usage:
  confluence <pageUrl|pageId>        Same as confluence pull <pageUrl|pageId>
  confluence pull [pageUrl|pageId]   Fetch one page tree, or all local pages when omitted
  confluence push [pageId]           Push one page, or all local pages when omitted
  confluence sync <path.md>          Pull or push one file from frontmatter state
  confluence status                  Show clean / modified / behind / links state
  confluence verify                  Fail if any relative .md links remain
  confluence -h, --help              Print help message

Markdown pages use YAML frontmatter (id, title, version, url, syncedHash, ...).
Default pull/push roots are under ./confluence/, but sync works on any frontmatter file.
Links must use full Confluence wiki URLs or Jira /browse/KEY URLs, not relative .md paths.
Requires: acli confluence auth login
`);
}
