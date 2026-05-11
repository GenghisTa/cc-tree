import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanAll, buildMergeContent } from '../core/scanner.js';
import { getConfig } from '../config/config.js';
import type { Config } from '../core/types.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

// 兼容 dev (tsx) 和 build (tsc) 两种运行模式
function resolveWebDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const isDev = thisFile.includes('src');
  if (isDev) {
    // src/cli/serve.ts → src/web/
    return join(dirname(dirname(thisFile)), 'web');
  }
  // dist/cli/serve.js → dist/web/
  return join(dirname(dirname(thisFile)), 'web');
}

const WEB_DIR = resolveWebDir();

async function handleAPI(req: URL, method: string, body?: string) {
  if (req.pathname === '/api/scan') {
    const files = await scanAll();
    const mergeContent = buildMergeContent(files);
    return { status: 200, data: { files, mergeContent } };
  }
  if (req.pathname === '/api/open' && method === 'POST' && body) {
    try {
      const { path } = JSON.parse(body);
      if (!path) return { status: 400, data: { error: 'path required' } };
      const { openInEditor } = await import('./open-editor.js');
      await openInEditor({ editor: getConfig().editor, filePath: path });
      return { status: 200, data: { ok: true } };
    } catch (err) {
      return { status: 500, data: { error: String(err) } };
    }
  }
  return { status: 404, data: { error: 'not found' } };
}

function serveStatic(urlPath: string): { status: number; content: string | Buffer; type: string } {
  let filePath = join(WEB_DIR, urlPath === '/' ? 'index.html' : urlPath);

  if (!existsSync(filePath)) {
    filePath = join(WEB_DIR, 'index.html');
  }

  const ext = extname(filePath);
  const content = readFileSync(filePath);
  return {
    status: 200,
    content,
    type: MIME_TYPES[ext] || 'application/octet-stream',
  };
}

export function startServer(config: Config) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (url.pathname.startsWith('/api/')) {
        const body: string | undefined = req.method === 'POST' ? await new Promise<string>((resolve) => {
          let data = '';
          req.on('data', (chunk) => data += chunk);
          req.on('end', () => resolve(data));
        }) : undefined;
        const result = await handleAPI(url, req.method!, body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.data));
        return;
      }

      const staticResult = serveStatic(url.pathname);
      res.writeHead(staticResult.status, { 'Content-Type': staticResult.type });
      res.end(staticResult.content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  });

  const port = config.port;
  server.listen(port, () => {
    console.log(`🌐 CC-tree Web 界面已启动: http://localhost:${port}`);
    console.log(`按 Ctrl+C 停止服务`);
  });

  return server;
}