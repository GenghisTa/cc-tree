import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import fg from 'fast-glob';
import type { ClaudeMDFile, ScanOptions } from './types.js';
import { parseClaudeMD } from './parser.js';

function getLevel(path: string, cwd: string): { level: ClaudeMDFile['level']; priority: number } {
  const home = homedir();
  const resolved = resolve(path);

  if (resolved.startsWith(resolve(join(home, '.claude')))) {
    return { level: 'user', priority: 1 };
  }
  if (resolved.startsWith(resolve(cwd)) && resolved !== resolve(join(cwd, 'CLAUDE.md'))) {
    return { level: 'submodule', priority: 3 };
  }
  return { level: 'project', priority: 2 };
}

function shouldSkipDir(dir: string): boolean {
  const base = dir.split(/[\\/]/).pop() || '';
  return ['node_modules', '.git', '.svn', '.hg', 'dist', '.next', '.cache'].includes(base);
}

export async function scanAll(options: ScanOptions = {}): Promise<ClaudeMDFile[]> {
  const cwd = resolve(options.cwd || process.cwd());
  const depth = options.depth ?? 5;
  const home = homedir();

  const filePaths = new Set<string>();

  // 1. Scan ~/.claude/ for CLAUDE.md
  const claudeDir = join(home, '.claude');
  if (existsSync(claudeDir)) {
    const globalFiles = await fg('**/CLAUDE.md', {
      cwd: claudeDir,
      absolute: true,
      deep: 3,
      ignore: ['node_modules', '.git'],
    });
    for (const f of globalFiles) filePaths.add(f);
  }

  // 2. Scan home directory for ~/CLAUDE.md
  const homeClaude = join(home, 'CLAUDE.md');
  if (existsSync(homeClaude)) {
    filePaths.add(homeClaude);
  }

  // 3. Scan cwd root for CLAUDE.md
  const cwdClaude = join(cwd, 'CLAUDE.md');
  if (existsSync(cwdClaude)) {
    filePaths.add(cwdClaude);
  }

  // 4. Scan cwd subdirectories recursively
  const subFiles = await fg('**/CLAUDE.md', {
    cwd,
    absolute: true,
    deep: depth,
    ignore: ['node_modules', '.git', '**/node_modules/**', '**/.git/**'],
  });
  for (const f of subFiles) {
    const rel = relative(cwd, f);
    if (rel.startsWith('..') || rel === 'CLAUDE.md' || rel.startsWith('.claude/CLAUDE.md')) {
      continue;
    }
    filePaths.add(f);
  }

  // 5. Scan .claude/ subdirectories for CLAUDE.md (project-level .claude/CLAUDE.md)
  const dotClaudeFiles = await fg('.claude/**/CLAUDE.md', {
    cwd,
    absolute: true,
    deep: depth,
    ignore: ['**/node_modules/**'],
  });
  for (const f of dotClaudeFiles) {
    filePaths.add(f);
  }

  // 6. Custom paths
  if (options.customPaths) {
    for (const p of options.customPaths) {
      const absPath = resolve(cwd, p);
      if (existsSync(absPath)) {
        filePaths.add(absPath);
      }
    }
  }

  // Parse all files
  const results: ClaudeMDFile[] = [];
  for (const filePath of filePaths) {
    try {
      const { headings, content, size } = await parseClaudeMD(filePath);
      const { level, priority } = getLevel(filePath, cwd);
      results.push({ path: filePath, level, priority, headings, content, size });
    } catch {
      // skip unreadable files
    }
  }

  // Sort: by priority, then by path
  results.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.path.localeCompare(b.path);
  });

  return results;
}

export function buildMergeContent(files: ClaudeMDFile[]): string {
  const priorityLabels: Record<number, string> = { 1: '① 用户级', 2: '② 项目级', 3: '③ 子模块级' };
  const parts: string[] = [];
  for (const file of files) {
    const label = priorityLabels[file.priority] || `④ 其他`;
    parts.push(`--- ${label}: ${file.path} ---`);
    parts.push(file.content);
    parts.push('');
  }
  return parts.join('\n');
}