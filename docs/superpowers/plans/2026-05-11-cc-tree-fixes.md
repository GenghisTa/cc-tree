# CC-tree Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix identified gaps between the cc-tree design spec and current implementation — editor integration (P0), Web UI edit button (P0), README (P1), dead code cleanup (P2), duplicate constants consolidation (P3).

**Architecture:** Add an `openEditor()` utility in a new `src/cli/open-editor.ts` module; wire it into Web UI via a new `/api/open` endpoint; add README; clean up dead code.

**Tech Stack:** TypeScript, Node.js `child_process` for editor launching, HTTP API for Web UI integration.

---

### Task 1: Create `src/cli/open-editor.ts` module

**Files:**
- Create: `src/cli/open-editor.ts`
- Modify: `src/core/types.ts`

- [ ] **Step 1: Add the editor type definition**

Modify `src/core/types.ts` to add the `OpenEditorOptions` interface:

Replace:
```typescript
export interface ScanResult {
  files: ClaudeMDFile[];
  mergeContent: string;
}
```

With:
```typescript
export interface OpenEditorOptions {
  editor?: string;
  filePath: string;
}

export interface ScanResult {
  files: ClaudeMDFile[];
  mergeContent: string;
}
```

- [ ] **Step 2: Create `src/cli/open-editor.ts`**

```typescript
import { spawn } from 'node:child_process';
import type { OpenEditorOptions } from '../core/types.js';

export function openInEditor(options: OpenEditorOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const { editor, filePath } = options;

    if (editor && editor !== 'default') {
      // Custom editor command — supports %f as file path placeholder
      const cmd = editor.includes('%f') ? editor.replace('%f', filePath) : `${editor} "${filePath}"`;
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
```

- [ ] **Step 3: Write test for `open-editor.ts`**

Create `src/cli/open-editor.test.ts`:

```typescript
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
    expect(spawn).toHaveBeenCalled();
  });

  it('替换 %f 占位符', async () => {
    const { spawn } = await import('node:child_process');
    await openInEditor({ editor: 'code -w %f', filePath: '/test/CLAUDE.md' });
    expect(spawn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: Run the test to verify**

Run: `npx vitest run src/cli/open-editor.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/cli/open-editor.ts src/cli/open-editor.test.ts src/core/types.ts
git commit -m "feat: add openInEditor utility for editor integration"
```

---

### Task 2: Wire up editor in CLI scan command

**Files:**
- Modify: `src/cli/scan.ts`
- Modify: `src/cli/index.ts`

- [ ] **Step 1: Add `--open` flag to scan command**

In `src/cli/index.ts`, add an `--open` option to the scan command:

Replace the scan command block:
```typescript
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
```

With:
```typescript
program
  .command('scan')
  .description('扫描并展示 CLAUDE.md 层级树')
  .option('--depth <number>', '递归深度', String, String(getConfig().scanDepth))
  .option('--json', 'JSON 格式输出')
  .option('--merge', '显示合并预览')
  .option('--open <path>', '用编辑器打开指定文件')
  .action(async (opts) => {
    const depth = parseInt(opts.depth, 10) || getConfig().scanDepth;
    if (opts.open) {
      const { openInEditor } = await import('./open-editor.js');
      await openInEditor({ editor: getConfig().editor, filePath: opts.open });
      return;
    }
    await scanCommand({ depth, json: !!opts.json, merge: !!opts.merge });
  });
```

- [ ] **Step 2: Commit**

```bash
git add src/cli/index.ts
git commit -m "feat: add --open flag to scan command for editor launch"
```

---

### Task 3: Add "Edit" button to Web UI

**Files:**
- Modify: `src/web/app.js`
- Modify: `src/web/index.html` (no change needed, just app.js)

- [ ] **Step 1: Add openFile API call and edit button in app.js**

Add an `openFile` function right after `copyPath`:

```javascript
async function openFile(encodedPath) {
  const path = decodeURIComponent(encodedPath);
  try {
    const res = await fetch('/api/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) {
      const err = await res.json();
      showToast(`打开失败: ${err.error}`, 'error');
    } else {
      showToast('已打开文件', 'success');
    }
  } catch (err) {
    showToast(`打开失败: ${err.message}`, 'error');
  }
}
```

Add a `showToast` helper that supports different styles:

Replace the existing `copyPath` function:
```javascript
function copyPath(encodedPath) {
  const path = decodeURIComponent(encodedPath);
  navigator.clipboard.writeText(path).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  });
}
```

With:
```javascript
function copyPath(encodedPath) {
  const path = decodeURIComponent(encodedPath);
  navigator.clipboard.writeText(path).then(() => {
    showToast('已复制到剪贴板', 'success');
  });
}

function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'copy-toast show';
  if (type === 'error') toast.style.background = '#f85149';
  else toast.style.background = '#3fb950';
  setTimeout(() => {
    toast.classList.remove('show');
    toast.style.background = '';
  }, 2000);
}
```

Add the "编辑" button next to "复制路径" in the `selectFile` function:

Replace the actions div inside `selectFile`:
```javascript
      <div class="actions">
        <button class="btn" onclick="copyPath('${encodeURIComponent(file.path)}')">📋 复制路径</button>
      </div>
```

With:
```javascript
      <div class="actions">
        <button class="btn" onclick="copyPath('${encodeURIComponent(file.path)}')">📋 复制路径</button>
        <button class="btn btn-primary" onclick="openFile('${encodeURIComponent(file.path)}')">✏️ 编辑</button>
      </div>
```

- [ ] **Step 2: Add `/api/open` endpoint in serve.ts**

In `src/cli/serve.ts`, modify the `handleAPI` function:

```typescript
async function handleAPI(req: URL, body?: string): Promise<{ status: number; data: unknown }> {
  if (req.pathname === '/api/scan') {
    const files = await scanAll();
    const mergeContent = buildMergeContent(files);
    return { status: 200, data: { files, mergeContent } };
  }
  if (req.pathname === '/api/open' && req.method === 'POST' && body) {
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
```

Also update the server request handler to pass the request body to `handleAPI`:

Replace:
```typescript
      if (url.pathname.startsWith('/api/')) {
        const result = await handleAPI(url);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.data));
        return;
      }
```

With:
```typescript
      if (url.pathname.startsWith('/api/')) {
        const body = req.method === 'POST' ? await new Promise<string>((resolve) => {
          let data = '';
          req.on('data', (chunk) => data += chunk);
          req.on('end', () => resolve(data));
        }) : undefined;
        const result = await handleAPI(url, body);
        res.writeHead(result.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result.data));
        return;
      }
```

Add the import for `getConfig` at the top of `serve.ts`:

Replace:
```typescript
import type { Config } from '../core/types.js';
```

With:
```typescript
import { getConfig } from '../config/config.js';
import type { Config } from '../core/types.js';
```

- [ ] **Step 3: Commit**

```bash
git add src/web/app.js src/cli/serve.ts
git commit -m "feat: add Edit button in Web UI and /api/open endpoint"
```

---

### Task 4: Add README documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

```markdown
# CC-tree (Claude Memory Hub)

轻量级 CLI + Web 工具，用于管理和可视化当前工作路径下的 CLAUDE.md 文件层级结构。

## 安装

```bash
npm install -g cmm
```

## 使用

### 扫描 CLAUDE.md 层级

```bash
# 终端树形展示
cmm scan

# JSON 格式输出
cmm list --json

# 显示合并预览
cmm scan --merge

# 控制递归深度
cmm scan --depth 3
```

### Web 界面

```bash
cmm serve
# 访问 http://localhost:3000
```

### 配置编辑器

```bash
# 使用默认编辑器
cmm config set editor default

# 使用 Typora
cmm config set editor typora

# 使用 VS Code
cmm config set editor "code -w %f"   # %f 会被替换为文件路径

# 查看当前配置
cmm config get
```

### 命令行打开文件

```bash
cmm scan --open path/to/CLAUDE.md
```

## 文件层级

| 层级 | 路径 | 优先级 |
|------|------|--------|
| 用户级 | `~/.claude/` | ① 最低 |
| 项目级 | `cwd/` 或 `cwd/.claude/` | ② |
| 子模块级 | `cwd/subdir/` | ③ 最高 |

规则加载顺序：用户级 → 项目级 → 子模块级（子级覆盖父级同名配置）。

## 配置

配置文件位于 `~/.claude-cc/config.json`：

```json
{
  "editor": "default",
  "scanDepth": 5,
  "port": 3000
}
```

## 许可证

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with usage guide"
```

---

### Task 5: Clean up unused `renderMergePreview` in render.ts

**Files:**
- Modify: `src/cli/render.ts`
- Note: this function is imported in `scan.ts` but never called (the `--merge` flag uses `buildMergeContent` directly instead)

- [ ] **Step 1: Verify renderMergePreview is unused in scan.ts**

Run: `grep -n "renderMergePreview" src/cli/scan.ts`
Expected output: the import line (dynamic import) — the function is imported but never invoked; the `--merge` path calls `buildMergeContent` instead.

- [ ] **Step 2: Remove renderMergePreview from render.ts**

Delete the `renderMergePreview` function (lines 65-91) from `src/cli/render.ts`.

- [ ] **Step 3: Remove the unused import in scan.ts**

In `src/cli/scan.ts`, change:
```typescript
  const { renderTree, renderMergePreview } = await import('./render.js');
```
To:
```typescript
  const { renderTree } = await import('./render.js');
```

- [ ] **Step 4: Run tests to verify nothing broke**

Run: `npx vitest run`
Expected: All tests pass (8 existing + 1 new = 9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/cli/render.ts src/cli/scan.ts
git commit -m "refactor: remove unused renderMergePreview function"
```

---

### Task 6: Consolidate duplicate constants

**Files:**
- Modify: `src/cli/render.ts`

The `prioritySymbols`, `levelLabels`, and `formatSize` in `render.ts` are duplicates of identical constructs in `src/web/app.js`. The app.js ones are the canonical definition for the Web UI. For `render.ts`, just deduplicate where the same values already exist in `src/core/types.ts` or shared modules.

- [ ] **Step 1: Verify which constants are truly duplicated**

Check that `prioritySymbols` and `levelLabels` in `render.ts` duplicate values in `scanner.ts`. The scanner has `priorityLabels` (with text labels like "① 用户级"), while render.ts has separate symbol/label maps. These are used differently and cannot be trivially merged without changing semantics. We already cleaned up the main issue (unused `renderMergePreview`).

Given the complexity and that these are 2 lines each with no runtime cost, skip this task — the consolidation would add unnecessary coupling for negligible benefit.

- [ ] **Step 2: Close this task**

Nothing to change here. The duplicates are in different layers (CLI rendering vs Web UI JS) and consolidating them would require a shared constants module, which is premature for this scope.

---

### Task 7: Final verification

**Files:**
- N/A

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Build to verify compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Quick smoke test**

Run: `node dist/cli/index.js --help`
Expected: Help output shows all commands

- [ ] **Step 4: Report completion**

Summarize what was changed and what remains.