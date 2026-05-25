/// <reference types="node" />

export interface ProjectInfo {
  name: string;
  analyzedAt: string;
  sourceFiles: number;
  totalLoc: number;
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  name: string;
  path: string;
  loc: number;
  exports: {
    types: string[];
    functions: string[];
    classes: string[];
    constants: string[];
  };
  imports: {
    uniqueModules: number;
    list: string[];
  };
  fanIn: number;
  fanOut: number;
  adapterCount: number;
  adapterPaths: string[];
  seamLocation: string;
  testsPierceInterface: boolean;
  testFilePaths: string[];
}

export interface EnrichedModuleInfo extends ModuleInfo {
  interfaceSurface: number;
  depthRatio: number;
  depthAssessment: "Deep" | "Shallow" | "Unclear";
  depthReason: string;
  seamQuality: "Real" | "Hypothetical" | "Missing";
  isPassThrough: boolean;
}

export interface EnrichedProjectInfo extends ProjectInfo {
  modules: EnrichedModuleInfo[];
}
