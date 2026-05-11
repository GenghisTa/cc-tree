import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';
import fg from 'fast-glob';
import type { ClaudeMDFile, ScanOptions } from './types.js';
import { parseClaudeMD } from './parser.js';
import { discoverProjects } from './projects.js';

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

function getLevel(path: string, cwd: string): { level: ClaudeMDFile['level']; priority: number } {
  const home = homedir();
  const resolved = resolve(path);

  if (resolved.startsWith(resolve(join(home, '.claude')))) {
    return { level: 'user', priority: 1 };
  }

  const cwdResolved = resolve(cwd);
  const cwdRootClaude = resolve(join(cwdResolved, 'CLAUDE.md'));
  const cwdDotClaude = resolve(join(cwdResolved, '.claude', 'CLAUDE.md'));
  if (resolved === cwdRootClaude || resolved === cwdDotClaude) {
    return { level: 'project', priority: 2 };
  }

  if (resolved.startsWith(cwdResolved)) {
    return { level: 'submodule', priority: 3 };
  }

  return { level: 'project', priority: 2 };
}

/**
 * Determine level in global mode using the project path as the anchor
 */
function getLevelGlobal(filePath: string, projectPaths: string[]): { level: ClaudeMDFile['level']; priority: number } {
  const resolved = resolve(filePath);
  const home = homedir();

  // Home / ~/.claude files are always user level
  if (resolved.startsWith(resolve(join(home, '.claude'))) || resolved === resolve(join(home, 'CLAUDE.md'))) {
    return { level: 'user', priority: 1 };
  }

  // Check against known project paths
  for (const pp of projectPaths) {
    const ppResolved = resolve(pp);
    if (resolved === resolve(join(ppResolved, 'CLAUDE.md')) || resolved === resolve(join(ppResolved, '.claude', 'CLAUDE.md'))) {
      return { level: 'project', priority: 2 };
    }
  }
  for (const pp of projectPaths) {
    const ppResolved = resolve(pp);
    if (resolved.startsWith(ppResolved)) {
      return { level: 'submodule', priority: 3 };
    }
  }

  return { level: 'project', priority: 2 };
}

function getProjectInfo(filePath: string, projectPaths: Map<string, string>): { projectPath?: string; projectName?: string } {
  const resolved = resolve(filePath);
  let best = '';
  for (const [pp, encodedName] of projectPaths) {
    const ppResolved = resolve(pp);
    if (resolved.startsWith(ppResolved) && ppResolved.length > best.length) {
      best = pp;
    }
  }
  if (best) {
    return { projectPath: best, projectName: basename(best) };
  }
  return {};
}

// Files to scan per project
const PROJECT_SCAN_PATTERNS = [
  '**/CLAUDE.md',
  '**/CLAUDE.local.md',
];

export async function scanAll(options: ScanOptions = {}): Promise<ClaudeMDFile[]> {
  const cwd = resolve(options.cwd || process.cwd());
  const depth = options.depth ?? 5;
  const home = homedir();
  const isGlobal = options.global !== false;

  const filePaths = new Set<string>();

  // --- Always scan home + ~/.claude ---
  const claudeDir = join(home, '.claude');
  try {
    if (existsSync(claudeDir)) {
      const globalFiles = await fg('**/CLAUDE.md', {
        cwd: claudeDir,
        absolute: true,
        deep: 3,
        ignore: ['node_modules', '.git'],
      });
      for (const f of globalFiles) filePaths.add(normalizePath(f));
    }
  } catch {
    // ~/.claude/ may contain inaccessible symlinks on Windows
  }
  const homeClaude = join(home, 'CLAUDE.md');
  if (existsSync(homeClaude)) filePaths.add(normalizePath(homeClaude));

  if (isGlobal) {
    // --- Global mode: scan all discovered projects ---
    const projects = discoverProjects();

    for (const project of projects) {
      // Apply project filter if set
      if (options.projectFilter) {
        const filterPath = resolve(options.projectFilter);
        if (!project.projectPath.toLowerCase().startsWith(filterPath.toLowerCase())) {
          continue;
        }
      }

      const projectDir = project.projectPath;
      if (!existsSync(projectDir)) continue;

      // Scan root CLAUDE.md and CLAUDE.local.md
      for (const pattern of PROJECT_SCAN_PATTERNS) {
        const rootFile = join(projectDir, pattern.replace('**/', ''));
        if (existsSync(rootFile)) filePaths.add(normalizePath(rootFile));
      }

      // Scan recursively
      try {
        const subFiles = await fg('**/CLAUDE.md', {
          cwd: projectDir,
          absolute: true,
          deep: depth,
          ignore: ['node_modules', '.git', '**/node_modules/**', '**/.git/**'],
        });
        for (const f of subFiles) filePaths.add(normalizePath(f));
      } catch {
        // skip inaccessible project dirs
      }
    }
  } else {
    // --- Legacy mode: scan only cwd ---
    const cwdClaude = join(cwd, 'CLAUDE.md');
    if (existsSync(cwdClaude)) filePaths.add(normalizePath(cwdClaude));

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
      filePaths.add(normalizePath(f));
    }

    // Scan .claude/ subdirectories
    const dotClaudeFiles = await fg('.claude/**/CLAUDE.md', {
      cwd,
      absolute: true,
      deep: depth,
      ignore: ['**/node_modules/**'],
    });
    for (const f of dotClaudeFiles) filePaths.add(normalizePath(f));
  }

  // Custom paths (always honored regardless of mode)
  const customOverrides = new Map<string, { level?: string; priority?: number }>();
  if (options.customPaths) {
    for (const entry of options.customPaths) {
      if (typeof entry === 'string') {
        const absPath = resolve(cwd, entry);
        if (existsSync(absPath)) filePaths.add(normalizePath(absPath));
      } else {
        const absPath = resolve(cwd, entry.path);
        if (existsSync(absPath)) {
          filePaths.add(normalizePath(absPath));
          if (entry.level || entry.priority) {
            customOverrides.set(absPath, { level: entry.level, priority: entry.priority });
          }
        }
      }
    }
  }

  // Build project path index for enrichment
  const projectPaths = new Map<string, string>();
  if (isGlobal) {
    for (const project of discoverProjects()) {
      projectPaths.set(project.projectPath, project.encodedName);
    }
  } else {
    projectPaths.set(cwd, basename(cwd));
  }

  // Parse all files
  const results: ClaudeMDFile[] = [];
  for (const filePath of filePaths) {
    try {
      const { headings, content, size } = await parseClaudeMD(filePath);
      const override = customOverrides.get(filePath);

      let level: ClaudeMDFile['level'];
      let priority: number;
      if (override) {
        level = (override.level as ClaudeMDFile['level']) || getLevel(filePath, cwd).level;
        priority = override.priority ?? getLevel(filePath, cwd).priority;
      } else if (isGlobal) {
        ({ level, priority } = getLevelGlobal(filePath, [...projectPaths.keys()]));
      } else {
        ({ level, priority } = getLevel(filePath, cwd));
      }

      const { projectPath, projectName } = isGlobal ? getProjectInfo(filePath, projectPaths) : {};

      results.push({ path: filePath, level, priority, headings, content, size, projectPath, projectName });
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