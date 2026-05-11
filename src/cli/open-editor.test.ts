import { describe, it, expect, vi } from 'vitest';
import { openInEditor } from './open-editor.js';

vi.mock('node:child_process', () => {
  const mockSpawn = vi.fn(() => {
    const proc = {
      on: vi.fn((event, handler) => {
        if (event === 'close') setTimeout(() => handler(0), 10);
        return proc;
      }),
    };
    return proc;
  });
  return { spawn: mockSpawn };
});

describe('openInEditor', () => {
  it('调用自定义编辑器命令', async () => {
    const { spawn } = await import('node:child_process');
    await openInEditor({ editor: 'typora', filePath: '/test/CLAUDE.md' });
    expect(spawn).toHaveBeenCalledWith(
      'typora',
      ['/test/CLAUDE.md'],
      expect.objectContaining({ stdio: 'inherit', shell: true }),
    );
  });

  it('替换 %f 占位符', async () => {
    const { spawn } = await import('node:child_process');
    await openInEditor({ editor: 'code -w %f', filePath: '/test/CLAUDE.md' });
    expect(spawn).toHaveBeenCalledWith(
      'code',
      ['-w', '/test/CLAUDE.md'],
      expect.objectContaining({ stdio: 'inherit', shell: true }),
    );
  });
});