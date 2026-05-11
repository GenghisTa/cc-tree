import { readFile } from 'node:fs/promises';

export function parseHeadings(content: string): string[] {
  const headings: string[] = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (match) {
      headings.push(`${match[1].replace(/^#+/, (m) => '  '.repeat(m.length - 1))}- ${match[2].trim()}`);
    }
  }
  return headings;
}

export async function parseClaudeMD(filePath: string): Promise<{
  headings: string[];
  content: string;
  size: number;
}> {
  const content = await readFile(filePath, 'utf-8');
  const headings = parseHeadings(content);
  return { headings, content, size: content.length };
}