---
name: architecture
description: Use when you need to get an understanding of a TypeScript project's architecture and file structure.
---

# archview

Static import/export overview for a TypeScript repo (via `ts-morph` + `tsconfig.json` in the working directory).

## Run

From the **project root** (where `tsconfig.json` lives):

```bash
cd tools/archview && npm install && npm link   # once
```

Then either:

```bash
archview analyze
```

or (no link):

```bash
node /path/to/dotfiles/tools/archview/bin/archview.js analyze
```

Run with **`cwd`** set to the repo you want analyzed (the tool does not take a path argument for the project).

## Output

- **Stdout:** Brief pointer to which **`.context/architecture/*.md`** file covers what (counts + paths). Redirect if you want a copy, e.g. `archview analyze > .context/architecture-index.md`.
- **Disk:** `.context/architecture/` — `external-packages.md` (snapshot + how to read + externals), `entrypoints.md`, `roots-and-orphans.md`, `graph-metrics.md`, `import-edges.md`, `file-catalog.md`.

## Flags

| Flag | Purpose |
| --- | --- |
| `--prefix <dir>` | Only source files under this relative path |
| `--max-files <n>` | Cap files after prefix (lexicographic) |
| `--catalog-limit <n>` | Truncate `file-catalog.md` only |
| `--tsconfig <file>` | Alternate tsconfig path |
