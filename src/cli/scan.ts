import type { ScanOptions } from '../core/types.js';
import { scanAll } from '../core/scanner.js';

export async function scanCommand(options: ScanOptions & { json?: boolean; merge?: boolean }) {
  const files = await scanAll(options);

  if (options.json) {
    console.log(JSON.stringify(files, null, 2));
    return;
  }

  const { renderTree } = await import('./render.js');
  renderTree(files, options.cwd);

  if (options.merge) {
    const { buildMergeContent } = await import('../core/scanner.js');
    console.log(buildMergeContent(files));
  }
}