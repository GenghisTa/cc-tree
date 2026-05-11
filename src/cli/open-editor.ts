import { spawn } from 'node:child_process';
import type { OpenEditorOptions } from '../core/types.js';

export function openInEditor(options: OpenEditorOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const { editor, filePath } = options;

    if (editor && editor !== 'default') {
      // Custom editor command — supports %f as file path placeholder
      // When no %f placeholder: append filePath as a separate arg (no quoting needed — spawn handles it)
      // When %f present: replace placeholder and split into command + args
      const cmd = editor.includes('%f') ? editor.replace('%f', filePath) : `${editor} ${filePath}`;
      const parts = cmd.split(/\s+/);
      const child = spawn(parts[0], parts.slice(1), {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      });
      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Editor exited with code ${code}`));
      });
      child.on('error', reject);
    } else {
      // Default: open with OS default app for .md
      const openCmd = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
      if (process.platform === 'win32') {
        // start on Windows: first quoted arg is window title, "" sets empty title
        spawn(openCmd, ['""', filePath], { shell: true })
          .on('close', (code) => code === 0 ? resolve() : reject(new Error(`Failed to open file`)))
          .on('error', reject);
      } else {
        spawn(openCmd, [filePath], { stdio: 'ignore' })
          .on('close', (code) => code === 0 ? resolve() : reject(new Error(`Failed to open file`)))
          .on('error', reject);
      }
    }
  });
}