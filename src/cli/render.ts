import chalk from 'chalk';
import { relative } from 'node:path';
import type { ClaudeMDFile } from '../core/types.js';

const prioritySymbols: Record<number, string> = { 1: '①', 2: '②', 3: '③' };
const levelLabels: Record<string, string> = { user: '用户级', project: '项目级', submodule: '子模块级' };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function renderTree(files: ClaudeMDFile[], cwd?: string): void {
  if (files.length === 0) {
    console.log(chalk.yellow('未找到 CLAUDE.md 文件'));
    return;
  }

  const baseDir = cwd || process.cwd();

  // Group by level
  const groups: Record<string, ClaudeMDFile[]> = {};
  for (const file of files) {
    if (!groups[file.level]) groups[file.level] = [];
    groups[file.level].push(file);
  }

  const levelOrder = ['user', 'project', 'submodule'];

  for (const level of levelOrder) {
    const groupFiles = groups[level];
    if (!groupFiles || groupFiles.length === 0) continue;

    const label = levelLabels[level] || level;
    const prefix = level === 'user' ? '' : chalk.dim('  ');
    console.log(`\n${prefix}📁 ${chalk.bold(label)}`);

    for (let i = 0; i < groupFiles.length; i++) {
      const file = groupFiles[i];
      const isLast = i === groupFiles.length - 1;
      const branch = isLast ? '  └── ' : '  ├── ';
      const pipe = isLast ? '      ' : '  │   ';

      const symbol = prioritySymbols[file.priority] || '④';
      const relativePath = relative(baseDir, file.path);
      const sizeStr = chalk.dim(formatSize(file.size));

      console.log(`${prefix}${branch}${chalk.cyan(relativePath)} ${chalk.yellow(symbol)} ${sizeStr}`);

      // Show headings
      if (file.headings.length > 0) {
        const previewHeadings = file.headings.slice(0, 5);
        for (const heading of previewHeadings) {
          console.log(`${prefix}${pipe}${chalk.dim(heading)}`);
        }
        if (file.headings.length > 5) {
          console.log(`${prefix}${pipe}${chalk.dim(`  ... +${file.headings.length - 5} more`)}`);
        }
      }
    }
  }
}

