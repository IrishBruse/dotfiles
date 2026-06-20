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

export function formatPathTree(
  paths: string[],
  paintLine: (prefix: string, name: string, role: PathTreeRole) => string
): string[] {
  const stowPaths = new Set(paths);
  const root = buildTree(paths);
  const lines: string[] = [paintLine("    ", ".", "group")];

  for (const [name, node] of sortedChildren(root)) {
    formatBranch(node, "    ", false, name, name, stowPaths, paintLine, lines);
  }

  return lines;
}

function formatBranch(
  node: TreeNode,
  prefix: string,
  isLast: boolean,
  name: string,
  fullPath: string,
  stowPaths: Set<string>,
  paintLine: (prefix: string, name: string, role: PathTreeRole) => string,
  lines: string[]
): void {
  const branch = isLast ? "└── " : "├── ";
  lines.push(paintLine(prefix + branch, name, pathRole(fullPath, stowPaths)));

  const childPrefix = prefix + (isLast ? "    " : "│   ");
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
      lines
    );
  });
}
