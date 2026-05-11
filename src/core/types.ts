export type ClaudeMDLevel = 'user' | 'project' | 'submodule';

export interface ClaudeMDFile {
  path: string;
  level: ClaudeMDLevel;
  priority: number;
  headings: string[];
  content: string;
  size: number;
}

export interface ScanOptions {
  depth?: number;
  cwd?: string;
  customPaths?: (string | { path: string; level?: ClaudeMDLevel; priority?: number })[];
}

export interface Config {
  editor: string;
  scanDepth: number;
  port: number;
}

export interface OpenEditorOptions {
  editor?: string;
  filePath: string;
}

export interface ScanResult {
  files: ClaudeMDFile[];
  mergeContent: string;
}