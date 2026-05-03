# archscan

Static analysis scanner that produces `.context/architecture-data.json` for the `analyse-architecture` skill.

## Install

```bash
cd tools/archscan && npm install && npm link
```

## Usage

```bash
# Scan + enrich in one step (writes .context/architecture-data.json)
archscan /path/to/project

# Scan only (raw metrics, no derived analysis)
archscan scan /path/to/project

# Enrich an existing scan
archscan enrich /path/to/project

# Custom output path
archscan scan /path/to/project ./custom-output.json
```

## What it collects

Per module (one source file):

| Metric | Description |
| --- | --- |
| `loc` | Lines of code (non-blank, non-comment) |
| `exports` | Types, functions, classes, constants exported |
| `imports` | Unique modules imported |
| `fanIn` | How many other files import this module |
| `fanOut` | How many other modules this file imports |
| `adapterCount` | Detected adapter implementations (by naming convention) |
| `seamLocation` | Primary entry point (first exported function/class) |
| `testFilePaths` | Matching test files (*.test.*, *.spec.*) |
| `testsPierceInterface` | Whether tests access private/internal symbols |

Derived (enrich phase):

| Metric | Description |
| --- | --- |
| `interfaceSurface` | Total count of exported symbols |
| `depthRatio` | LOC / interfaceSurface |
| `depthAssessment` | Deep / Shallow / Unclear |
| `seamQuality` | Real (2+ adapters) / Hypothetical (1) / Missing (0 with surface > 3) |
| `isPassThrough` | True if low fan-in + tiny surface + small LOC |

## Supported languages

TypeScript, JavaScript, Python, Go. Basic support for Rust, Java, C# (exports only).
