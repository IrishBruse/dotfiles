---
name: architecture
description: Use when you need to get an understanding of a TypeScript project's architecture and file structure. Outputs to the .context/architecture/
---

# archview

Static import/export overview for a TypeScript repo (via `ts-morph` + `tsconfig.json` in the working directory).

```bash
archview analyze
```

| File                                       | Contents                                             |
| ------------------------------------------ | ---------------------------------------------------- |
| .context/architecture/file-catalog.md      | Per-file exports, imports, importers, raw specifiers |
| .context/architecture/import-edges.md      | All edges, sorted                                    |
| .context/architecture/entrypoints.md       | Entrypoint detection                                 |
| .context/architecture/graph-metrics.md     | Cycles + fan-in table                                |
| .context/architecture/roots-and-orphans.md | No-incoming / orphan candidates                      |
| .context/architecture/external-packages.md | Snapshot table + how to read the set                 |
