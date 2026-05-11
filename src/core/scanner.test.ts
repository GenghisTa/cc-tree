import { describe, it, expect } from 'vitest';
import { buildMergeContent } from './scanner.js';
import type { ClaudeMDFile } from './types.js';

describe('buildMergeContent', () => {
  const mockFiles: ClaudeMDFile[] = [
    {
      path: '/home/user/.claude/CLAUDE.md',
      level: 'user',
      priority: 1,
      headings: ['# Rules'],
      content: 'user rules',
      size: 10,
    },
    {
      path: '/project/CLAUDE.md',
      level: 'project',
      priority: 2,
      headings: ['# Project'],
      content: 'project rules',
      size: 14,
    },
    {
      path: '/project/sub/CLAUDE.md',
      level: 'submodule',
      priority: 3,
      headings: ['# Sub'],
      content: 'sub rules',
      size: 9,
    },
  ];

  it('按优先级顺序拼接内容', () => {
    const result = buildMergeContent(mockFiles);
    const userIdx = result.indexOf('① 用户级');
    const projectIdx = result.indexOf('② 项目级');
    const subIdx = result.indexOf('③ 子模块级');
    expect(userIdx).toBeGreaterThan(-1);
    expect(projectIdx).toBeGreaterThan(userIdx);
    expect(subIdx).toBeGreaterThan(projectIdx);
  });

  it('包含所有文件内容', () => {
    const result = buildMergeContent(mockFiles);
    expect(result).toContain('user rules');
    expect(result).toContain('project rules');
    expect(result).toContain('sub rules');
  });

  it('空数组返回空字符串', () => {
    expect(buildMergeContent([])).toBe('');
  });
});