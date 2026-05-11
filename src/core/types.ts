export type ClaudeMDLevel = 'user' | 'project' | 'submodule';

export interface ClaudeMDFile {
  path: string;
  level: ClaudeMDLevel;
  priority: number;
  headings: string[];
  content: string;
  size: number;
  projectPath?: string;
  projectName?: string;
}

export interface ScanOptions {
  depth?: number;
  cwd?: string;
  customPaths?: (string | { path: string; level?: ClaudeMDLevel; priority?: number })[];
  projectFilter?: string;
  global?: boolean;
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

export interface ProjectInfo {
  encodedName: string;
  projectPath: string;
  source: 'projects-dir' | 'home' | 'claude-dir';
}

export interface ScanResult {
  files: ClaudeMDFile[];
  mergeContent: string;
  projects?: string[];
}