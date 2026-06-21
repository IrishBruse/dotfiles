export interface TreeNode {
  children: Map<string, TreeNode>;
}

export function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { children: new Map() };

  for (const path of paths) {
    let node = root;
    for (const part of path.split("/")) {
      if (part === "") {
        continue;
      }
      let child = node.children.get(part);
      if (!child) {
        child = { children: new Map() };
        node.children.set(part, child);
      }
      node = child;
    }
  }

  return root;
}

function sortedChildren(node: TreeNode): [string, TreeNode][] {
  return [...node.children.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export type PathTreeRole = "path" | "group";

function pathRole(fullPath: string, stowPaths: Set<string>): PathTreeRole {
  return stowPaths.has(fullPath) ? "path" : "group";
}

export type PathTreePaintLine = (
  prefix: string,
  name: string,
  role: PathTreeRole,
  fullPath: string
) => string;

/** One rendered tree row with its stow-relative path. */
export interface FormattedTreeLine {
  line: string;
  fullPath: string;
}

export function formatPathTreeEntries(
  paths: string[],
  paintLine: PathTreePaintLine
): FormattedTreeLine[] {
  const stowPaths = new Set(paths);
  const root = buildTree(paths);
  const lines: FormattedTreeLine[] = [];
  const children = sortedChildren(root);

  children.forEach(([name, node], index) => {
    formatBranch(
      node,
      "",
      index === children.length - 1,
      name,
      name,
      stowPaths,
      paintLine,
      lines,
      0
    );
  });

  return lines;
}

export function formatPathTree(paths: string[], paintLine: PathTreePaintLine): string[] {
  return formatPathTreeEntries(paths, paintLine).map((entry) => entry.line);
}

function formatBranch(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  name: string,
  fullPath: string,
  stowPaths: Set<string>,
  paintLine: PathTreePaintLine,
  lines: FormattedTreeLine[],
  depth: number
): void {
  if (depth === 0) {
    lines.push({
      line: paintLine("", name, pathRole(fullPath, stowPaths), fullPath),
      fullPath
    });
  } else {
    const branch = isLast ? "└── " : "├── ";
    lines.push({
      line: paintLine(prefix + branch, name, pathRole(fullPath, stowPaths), fullPath),
      fullPath
    });
  }

  const childPrefix = depth === 0 ? "" : prefix + (isLast ? "    " : "│   ");
  const children = sortedChildren(node);
  children.forEach(([childName, childNode], index) => {
    formatBranch(
      childNode,
      childPrefix,
      index === children.length - 1,
      childName,
      `${fullPath}/${childName}`,
      stowPaths,
      paintLine,
      lines,
      depth + 1
    );
  });
}
