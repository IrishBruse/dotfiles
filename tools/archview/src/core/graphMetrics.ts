import type { FanInEntry, FileArchitecture } from "./types.ts";

/** Tarjan SCCs; returns components with size > 1, each sorted, list sorted by first path. */
export function findCircularImportGroups(files: FileArchitecture[]): string[][] {
    const nodes = files.map((f) => f.path).sort();
    const adj = new Map<string, string[]>();
    for (const f of files) {
        adj.set(f.path, [...f.projectImportPaths]);
    }

    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const stack: string[] = [];
    const onStack = new Set<string>();
    let nextIndex = 0;
    const sccs: string[][] = [];

    function strongConnect(v: string): void {
        index.set(v, nextIndex);
        lowlink.set(v, nextIndex);
        nextIndex++;
        stack.push(v);
        onStack.add(v);

        for (const w of adj.get(v) ?? []) {
            if (!index.has(w)) {
                strongConnect(w);
                lowlink.set(v, Math.min(lowlink.get(v)!, lowlink.get(w)!));
            } else if (onStack.has(w)) {
                lowlink.set(v, Math.min(lowlink.get(v)!, index.get(w)!));
            }
        }

        if (lowlink.get(v) === index.get(v)) {
            const comp: string[] = [];
            let w: string;
            do {
                w = stack.pop()!;
                onStack.delete(w);
                comp.push(w);
            } while (w !== v);
            if (comp.length > 1) {
                comp.sort();
                sccs.push(comp);
            }
        }
    }

    for (const v of nodes) {
        if (!index.has(v)) strongConnect(v);
    }

    sccs.sort((a, b) => a[0].localeCompare(b[0]));
    return sccs;
}

export function topFanIn(files: FileArchitecture[], n: number): FanInEntry[] {
    return [...files]
        .map((f) => ({ path: f.path, count: f.importedBy.length }))
        .sort((a, b) => b.count - a.count || a.path.localeCompare(b.path))
        .slice(0, n);
}
