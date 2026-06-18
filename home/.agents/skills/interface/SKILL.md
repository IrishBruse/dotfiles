---
name: interface
description: Produce a structured code interface breakdown for a specific feature, module, component, or service. Trigger when the user says things like "interface breakdown for X", "break down the interface of Y", "explain the API of Z", "on the UI/Components/TextInput", "what does Services/Auth export?", or references any file path or feature name alongside words like interface, API, contract, props, exports, or types. Always use this skill when the user wants to understand how a specific piece of code is consumed from the outside - regardless of whether it is a React component, Node service, CLI command, or utility module.
---

# Interface Breakdown

Produces a structured, caller-focused breakdown of the public code interface for any feature, module, component, or service path.

## Trigger examples

- `interface breakdown for UI/Components/TextInput`
- `on the Services/Auth`
- `explain the API of Commands/scaffold`
- `what does CLI/tools/standup export?`
- `break down the interface of src/utils/format`

---

## Process

### 1. Extract the target

Parse the feature path or name from the user's prompt. It may be:

- A directory path: `UI/Components/TextInput`
- A bare name: `TextInput`, `AuthService`, `scaffold`
- A partial path: `Components/TextInput`

Normalize to a case-insensitive search pattern.

---

### 2. Locate relevant files

Search for files matching the target, skipping `node_modules`, `dist`, `.git`, and build artefacts:

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  | grep -iv "node_modules\|/dist/\|\.git" \
  | grep -i "<feature-name>"
```

Within the resolved directory, check for these files in priority order:

| File | Purpose |
|------|---------|
| `index.ts` / `index.tsx` | Barrel / public re-exports |
| `types.ts` | Shared type definitions |
| `<Feature>.ts` / `<Feature>.tsx` | Primary implementation |
| `api.ts` | API surface layer |
| `errors.ts` | Error/exception types |
| `CONFIG.ts` | Configuration constants |

Read only files that exist. Start with index/type files; read implementation files only if the public surface is not clear from those.

**Ambiguity**: if the path resolves to multiple distinct modules, scope to the barrel/index and note sub-exports. Ask the user to narrow down if needed.

---

### 3. Analyze the interface

Extract and categorize the following from the files:

#### Exported types and interfaces

Every `export interface`, `export type`, and `export enum`. Include the full body.

#### Exported functions, classes, and constants

Every `export function`, `export const`, `export class`, `export default`. For each, capture:

- Full signature (params + return type)
- Brief purpose (from JSDoc, name, or inferred usage - label inferred as `(inferred)`)

#### Props (React / UI components only)

If the target is a component, extract the props interface separately. Capture each prop's type, whether it is required, and its description.

#### Dependencies (caller-relevant only)

Top-level imports that a caller should be aware of - external packages and internal peer modules. Skip internal implementation details (utilities, helpers used only inside the module).

#### Configuration and constants

Exported constants, config objects, environment flags, or defaults that affect behavior.

---

### 4. Output format

Produce the breakdown as a clean Markdown document:

````markdown
# Interface: <FeatureName>

**Location**: `<resolved path(s)>`

---

## Exported Types

### `TypeName`
```ts
<full type definition>
```
> <description or "(inferred)">

---

## Exports

### `functionName(param: Type, ...): ReturnType`
> <brief description>

### `ClassName`
> <brief description>
Methods:
- `methodName(params): ReturnType` - <purpose>

---

## Props _(components only)_

| Prop | Type | Required | Description |
|------|------|:--------:|-------------|
| `propName` | `type` | yes / - | description |

---

## Dependencies

| Import | Source | Relevance to caller |
|--------|--------|---------------------|
| `Thing` | `external-pkg` | <why a caller needs to know> |

---

## Usage Example

```ts
// Minimal working usage
import { Thing } from '<resolved-path>'

<concise snippet>
```
````

---

### 5. Edge cases

| Situation | Handling |
|-----------|----------|
| No files found | Say so clearly; suggest alternative search terms or ask the user to confirm the path |
| Directory with no index | Summarise all exported symbols across top-level files in the directory |
| Private / internal symbols | Omit anything prefixed `_`, marked `@internal`, or not exported |
| Plain JS (no types) | Document parameters and return values as inferred from usage; note the absence of types |
| Mixed TS + JSDoc | Treat JSDoc types as equivalent to TypeScript types |
| Very large files | Focus on the public surface only; do not read private implementation bodies unless needed to infer types |
