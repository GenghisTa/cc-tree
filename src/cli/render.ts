import chalk from 'chalk';
import type { ClaudeMDFile } from '../core/types.js';

const prioritySymbols: Record<number, string> = { 1: '①', 2: '②', 3: '③' };
const levelLabels: Record<string, string> = { user: '用户级', project: '项目级', submodule: '子模块级' };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function renderTree(files: ClaudeMDFile[]): void {
  if (files.length === 0) {
    console.log(chalk.yellow('未找到 CLAUDE.md 文件'));
    return;
  }

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
      const relativePath = file.path;
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

export function renderMergePreview(files: ClaudeMDFile[]): void {
  if (files.length === 0) return;

  const priorityLabels: Record<number, string> = { 1: '① 用户级', 2: '② 项目级', 3: '③ 子模块级' };
  console.log(chalk.bold('\n📋 合并预览（加载顺序）'));
  console.log(chalk.dim('='.repeat(50)));

  for (const file of files) {
    const label = priorityLabels[file.priority] || '④ 其他';
    console.log(`\n${chalk.bold.hex('#FFA500')(`--- ${label}: ${file.path} ---`)}`);
    // Show first 10 lines of content as preview
    const lines = file.content.split('\n');
    const preview = lines.slice(0, 10);
    for (const line of preview) {
      if (line.trim()) {
        console.log(`${chalk.dim('  ')}${line}`);
      }
    }
    if (lines.length > 10) {
      console.log(chalk.dim(`  ... (${lines.length - 10} more lines)`));
    }
  }
  console.log(chalk.dim('='.repeat(50)));
}