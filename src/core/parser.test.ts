import { describe, it, expect } from 'vitest';
import { parseHeadings } from './parser.js';

describe('parseHeadings', () => {
  it('提取 H1-H4 标题', () => {
    const content = `# Title\n## Section\n### Sub\n#### Detail\n普通文本`;
    const result = parseHeadings(content);
    expect(result).toHaveLength(4);
    expect(result[0]).toContain('Title');
    expect(result[1]).toContain('Section');
  });

  it('处理无标题的内容', () => {
    const result = parseHeadings('普通文本\n没有标题');
    expect(result).toHaveLength(0);
  });

  it('处理空内容', () => {
    const result = parseHeadings('');
    expect(result).toHaveLength(0);
  });

  it('忽略不在行首的 #', () => {
    const content = `# Real heading\`# not a heading\``;
    const result = parseHeadings(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('Real heading');
  });

  it('标题带格式缩进', () => {
    const content = `# A\n## B\n### C\n#### D`;
    const result = parseHeadings(content);
    expect(result[0]).toMatch(/^- /);         // H1 → 0 indent
    expect(result[1]).toMatch(/^\s{2}- /);    // H2 → 2 indent
    expect(result[2]).toMatch(/^\s{4}- /);    // H3 → 4 indent
    expect(result[3]).toMatch(/^\s{6}- /);    // H4 → 6 indent
  });
});