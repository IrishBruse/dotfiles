# Data Schema Reference

The `analyze.py` script outputs a single JSON object representing the repo root.
Every node (directory or file) shares the same shape.

## Node Schema

```typescript
interface ArchNode {
  // Identity
  name: string;            // filename or directory name
  path: string;            // path relative to repo root
  abs_path: string;        // absolute path on disk

  // Size metrics
  size: number;            // file size in bytes (sum for directories)
  loc: number;             // lines of code (0 for non-source files)

  // Hierarchy
  module_type: "directory" | "file" | "package";
  children: ArchNode[];    // empty for leaf files

  // Interface surface (populated by language-specific parsers)
  interface: {
    exports: string[];         // exported symbol names
    re_exports: string[];      // re-exported from other modules
    types: string[];           // type/interface/class names
    default_export: string | null;
  };

  // Dependency info
  imports: {
    path: string;              // import path as written in source
    resolved: string | null;   // resolved relative path if internal
    kind: "internal" | "external" | "unknown";
  }[];

  importer_count: number;      // how many other files import this one

  // Depth estimation
  depth_score: number;         // 0.0–1.0, or -1 if unknown
  depth_label: "shallow" | "moderate" | "deep" | "very-deep" | "unknown";
  depth_rationale: string;     // one-sentence human-readable explanation

  // Language
  language: string | null;     // "typescript", "python", "go", etc., or null
  is_test: boolean;            // true if filename matches test patterns
  is_generated: boolean;       // true if file is generated (*.min.js, *.pb.go, etc.)
}
```

## Top-Level Wrapper

```json
{
  "schema_version": "1",
  "generated_at": "2025-01-01T00:00:00Z",
  "repo_root": "<absolute path>",
  "summary": {
    "total_files": 412,
    "total_loc": 48920,
    "total_size_bytes": 3200000,
    "languages": { "typescript": 310, "css": 40, "json": 62 },
    "avg_depth_score": 0.44,
    "shallowest_modules": ["src/utils/noop.ts", "src/types/index.ts"],
    "deepest_modules": ["src/core/parser.ts", "src/services/db.ts"]
  },
  "root": { /* ArchNode */ }
}
```

## Colour Mapping

| depth_score | depth_label | hex colour | meaning |
|---|---|---|---|
| -1 | unknown | `#6b7280` | Non-source or unanalysed |
| 0.0–0.29 | shallow | `#e05252` | Interface ≈ implementation complexity |
| 0.30–0.59 | moderate | `#e0a832` | Some leverage |
| 0.60–0.79 | deep | `#32a88c` | Good leverage |
| 0.80–1.0 | very-deep | `#32c85a` | High leverage — strong module |

## Supported Languages (by analyze.py)

| Language | Extensions | What is extracted |
|---|---|---|
| TypeScript/JS | `.ts .tsx .js .jsx .mjs` | export/import statements, type defs |
| Python | `.py` | `__all__`, class/def at module level, imports |
| Go | `.go` | exported identifiers (capital first letter), imports |
| Rust | `.rs` | `pub` items, `use` statements |
| Other | any | file size only; interface = unknown |
