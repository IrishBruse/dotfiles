// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/**
 * @param {string} filePath
 */
function topLevelFolder(filePath) {
  const rel = path.relative(toolsRoot, filePath);
  const segment = rel.split(path.sep)[0];
  return segment === "" || segment.startsWith(".") ? null : segment;
}

/**
 * @param {string} importerPath
 * @param {string} importSource
 */
function importedTopLevelFolder(importerPath, importSource) {
  const withoutQuery = importSource.split("?")[0] ?? importSource;
  const resolved = path.resolve(path.dirname(importerPath), withoutQuery);
  return topLevelFolder(resolved);
}

/**
 * @param {string} importSource
 */
function importsApiModule(importSource) {
  const normalized = importSource.replace(/\\/g, "/");
  return (
    normalized.endsWith("/api") ||
    normalized.endsWith("/api.ts") ||
    normalized.endsWith("/api.js")
  );
}

/** @type {import('eslint').Rule.RuleModule} */
const crossFolderApi = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Cross-folder imports under tools/ must go through the target folder's api.ts"
    },
    schema: [],
    messages: {
      useApi:
        'Import from "{{folder}}" via "{{folder}}/api.ts" only, not "{{source}}".'
    }
  },
  create(context) {
    const filename = context.filename;
    const importerFolder = topLevelFolder(filename);
    if (importerFolder === null) {
      return {};
    }

    /**
     * @param {import('estree').ImportDeclaration | import('estree').ExportNamedDeclaration | import('estree').ExportAllDeclaration} node
     */
    function checkSource(node) {
      const source = node.source;
      if (source === null || source === undefined) {
        return;
      }
      const importSource = source.value;
      if (typeof importSource !== "string" || !importSource.startsWith(".")) {
        return;
      }
      const targetFolder = importedTopLevelFolder(filename, importSource);
      if (targetFolder === null || targetFolder === importerFolder) {
        return;
      }
      if (importsApiModule(importSource)) {
        return;
      }
      context.report({
        node: source,
        messageId: "useApi",
        data: { folder: targetFolder, source: importSource }
      });
    }

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource
    };
  }
};

export default crossFolderApi;
