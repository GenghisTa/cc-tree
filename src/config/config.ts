import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Config } from '../core/types.js';

const CONFIG_DIR = join(homedir(), '.claude-cc');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: Config = {
  editor: 'default',
  scanDepth: 5,
  port: 3000,
};

export function getConfig(): Config {
  try {
    if (existsSync(CONFIG_PATH)) {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // fall through to default
  }
  return { ...DEFAULT_CONFIG };
}

export function setConfig(key: keyof Config, value: string | number): void {
  const config = getConfig();
  if (key === 'editor') config.editor = String(value);
  else if (key === 'scanDepth') config.scanDepth = Number(value);
  else if (key === 'port') config.port = Number(value);

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}