import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ProjectInfo } from './types.js';

const PROJECTS_DIR = join(homedir(), '.claude', 'projects');

// Directories to skip when discovering projects
const SKIP_PATTERNS = [/vscode-extensions/i, /claude-code-hub/i];

function isSkipDir(name: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(name));
}

function extractCwdFromJsonl(filePath: string): string | null {
  try {
    // Only read first 64KB — .jsonl files can be huge
    const fd = readFileSync(filePath, { encoding: 'utf-8', flag: 'r' });
    const head = fd.slice(0, 65536);
    // Look for "cwd":"..." in the JSONL content
    const match = head.match(/"cwd"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
  } catch {
    // skip unreadable files
  }
  return null;
}

function listProjectsFromDir(): ProjectInfo[] {
  if (!existsSync(PROJECTS_DIR)) return [];

  const entries = readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const results: ProjectInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (isSkipDir(entry.name)) continue;

    const projectDir = join(PROJECTS_DIR, entry.name);

    // Use fs directly — readdirSync is fine for small dirs
    let files: string[];
    try {
      files = readdirSync(projectDir);
    } catch {
      continue;
    }

    const jsonlFile = files.find((f) => f.endsWith('.jsonl'));
    if (!jsonlFile) continue;

    const cwd = extractCwdFromJsonl(join(projectDir, jsonlFile));
    if (!cwd) continue;

    // Skip home directory (already scanned separately)
    if (cwd.toLowerCase() === homedir().toLowerCase()) continue;

    results.push({
      encodedName: entry.name,
      projectPath: cwd,
      source: 'projects-dir',
    });
  }

  return results;
}

let cachedProjects: ProjectInfo[] | null = null;

export function discoverProjects(): ProjectInfo[] {
  if (cachedProjects !== null) return cachedProjects;

  const projects = listProjectsFromDir();
  // Deduplicate by normalized path
  const seen = new Set<string>();
  cachedProjects = projects.filter((p) => {
    const key = p.projectPath.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return cachedProjects;
}

export function clearProjectsCache(): void {
  cachedProjects = null;
}