#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import type { EnrichedModuleInfo, EnrichedProjectInfo, ModuleInfo, ProjectInfo } from "../../types.ts";

const DEEP_DEPTH_RATIO_THRESHOLD = 15;
const SHALLOW_DEPTH_RATIO_THRESHOLD = 5;
const HIGH_FAN_IN = 5;
const LOW_FAN_IN = 1;

function computeInterfaceSurface(m: ModuleInfo): number {
  return m.exports.types.length + m.exports.functions.length
    + m.exports.classes.length + m.exports.constants.length;
}

function computeDepthRatio(loc: number, interfaceSurface: number): number {
  if (interfaceSurface === 0) return loc;
  return loc / interfaceSurface;
}

function assessDepth(m: ModuleInfo, depthRatio: number): { assessment: "Deep" | "Shallow" | "Unclear"; reason: string } {
  if (depthRatio >= DEEP_DEPTH_RATIO_THRESHOLD && m.fanIn >= HIGH_FAN_IN) {
    return {
      assessment: "Deep",
      reason: `depth ratio ${depthRatio.toFixed(1)} with fan-in ${m.fanIn}`,
    };
  }
  if (depthRatio >= DEEP_DEPTH_RATIO_THRESHOLD) {
    return {
      assessment: "Deep",
      reason: `depth ratio ${depthRatio.toFixed(1)} behind ${computeInterfaceSurface(m)} exports`,
    };
  }
  if (depthRatio <= SHALLOW_DEPTH_RATIO_THRESHOLD && m.fanIn <= LOW_FAN_IN && m.exports.functions.length <= 2) {
    if (m.loc < 30) {
      return {
        assessment: "Shallow",
        reason: `only ${m.loc} LOC with ${computeInterfaceSurface(m)} exports and fan-in ${m.fanIn}`,
      };
    }
    return {
      assessment: "Unclear",
      reason: `depth ratio ${depthRatio.toFixed(1)} — interface complexity partially matches implementation`,
    };
  }
  if (depthRatio <= SHALLOW_DEPTH_RATIO_THRESHOLD && m.fanIn <= LOW_FAN_IN) {
    return {
      assessment: "Shallow",
      reason: `low depth ratio ${depthRatio.toFixed(1)} and fan-in ${m.fanIn}`,
    };
  }
  return {
    assessment: "Unclear",
    reason: `depth ratio ${depthRatio.toFixed(1)} with fan-in ${m.fanIn} — requires manual review`,
  };
}

function assessSeamQuality(m: ModuleInfo): "Real" | "Hypothetical" | "Missing" {
  if (m.adapterCount >= 2) return "Real";
  if (m.adapterCount === 1) return "Hypothetical";
  if (m.adapterCount === 0 && computeInterfaceSurface(m) > 3) return "Missing";
  return "Hypothetical";
}

function isPassThrough(m: ModuleInfo): boolean {
  if (m.loc > 100) return false;
  const surface = computeInterfaceSurface(m);
  if (m.fanIn <= 1 && surface <= 2 && m.fanOut >= surface) return true;
  if (m.loc < 20 && m.exports.functions.length <= 1 && m.fanIn === 0) return true;
  return false;
}

function enrichModule(m: ModuleInfo): EnrichedModuleInfo {
  const interfaceSurface = computeInterfaceSurface(m);
  const depthRatio = computeDepthRatio(m.loc, interfaceSurface);
  const depthResult = assessDepth(m, depthRatio);
  const seamQuality = assessSeamQuality(m);
  const passThrough = isPassThrough(m);

  return {
    ...m,
    interfaceSurface,
    depthRatio: Math.round(depthRatio * 100) / 100,
    depthAssessment: depthResult.assessment,
    depthReason: depthResult.reason,
    seamQuality,
    isPassThrough: passThrough,
  };
}

export async function runEnrich(args: string[]): Promise<void> {
  const targetDir = args[0] ?? process.cwd();
  const inPath = args[1] ?? path.join(targetDir, ".context", "architecture-data.json");
  const outPath = args[2] ?? path.join(targetDir, ".context", "architecture-data.json");

  console.error(`Reading: ${inPath}`);

  let data: ProjectInfo;
  try {
    const raw = await readFile(inPath, "utf-8");
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${inPath}: ${err}`);
    process.exitCode = 1;
    return;
  }

  const enriched: EnrichedProjectInfo = {
    ...data,
    modules: data.modules.map(enrichModule),
  };

  const summary = computeSummary(enriched);
  console.error(`Enrichment complete:`);
  console.error(`  Deep modules: ${summary.deep}`);
  console.error(`  Shallow modules: ${summary.shallow}`);
  console.error(`  Unclear modules: ${summary.unclear}`);
  console.error(`  Real seams: ${summary.realSeams}`);
  console.error(`  Hypothetical seams: ${summary.hypotheticalSeams}`);
  console.error(`  Missing seams: ${summary.missingSeams}`);
  console.error(`  Pass-through modules: ${summary.passThrough}`);

  await writeFile(outPath, JSON.stringify(enriched, null, 2) + "\n", "utf-8");
  console.error(`Wrote: ${outPath}`);
}

function computeSummary(data: EnrichedProjectInfo) {
  const deep = data.modules.filter((m) => m.depthAssessment === "Deep").length;
  const shallow = data.modules.filter((m) => m.depthAssessment === "Shallow").length;
  const unclear = data.modules.filter((m) => m.depthAssessment === "Unclear").length;
  const realSeams = data.modules.filter((m) => m.seamQuality === "Real").length;
  const hypotheticalSeams = data.modules.filter((m) => m.seamQuality === "Hypothetical").length;
  const missingSeams = data.modules.filter((m) => m.seamQuality === "Missing").length;
  const passThrough = data.modules.filter((m) => m.isPassThrough).length;
  return { deep, shallow, unclear, realSeams, hypotheticalSeams, missingSeams, passThrough };
}
