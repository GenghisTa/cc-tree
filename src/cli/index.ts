#!/usr/bin/env node

import { Command } from 'commander';
import { scanCommand } from './scan.js';
import { startServer } from './serve.js';
import { getConfig, setConfig } from '../config/config.js';

const program = new Command();

program
  .name('cmm')
  .description('CC-tree — CLAUDE.md 上下文地图工具')
  .version('0.1.0');

program
  .command('scan')
  .description('扫描并展示 CLAUDE.md 层级树')
  .option('--depth <number>', '递归深度', String, String(getConfig().scanDepth))
  .option('--json', 'JSON 格式输出')
  .option('--merge', '显示合并预览')
  .action(async (opts) => {
    const depth = parseInt(opts.depth, 10) || getConfig().scanDepth;
    await scanCommand({ depth, json: !!opts.json, merge: !!opts.merge });
  });

program
  .command('list')
  .description('JSON 格式输出扫描结果')
  .option('--json', 'JSON 格式输出')
  .action(async () => {
    await scanCommand({ json: true });
  });

program
  .command('serve')
  .description('启动 Web 界面')
  .option('--port <number>', '端口号', String, String(getConfig().port))
  .action((opts) => {
    const port = parseInt(opts.port, 10) || getConfig().port;
    startServer({ ...getConfig(), port });
  });

program
  .command('config')
  .description('配置管理')
  .argument('[action]', 'set 或 get')
  .argument('[key]', '配置项 (editor, scanDepth, port)')
  .argument('[value]', '配置值')
  .action((action?: string, key?: string, value?: string) => {
    if (action === 'get' || (!action && !key)) {
      const config = getConfig();
      console.log(JSON.stringify(config, null, 2));
    } else if (action === 'set' && key && value) {
      setConfig(key as any, value);
      console.log(`已设置 ${key} = ${value}`);
    } else {
      console.log('用法: cmm config set <key> <value>');
      console.log('      cmm config get');
    }
  });

program.parse(process.argv);