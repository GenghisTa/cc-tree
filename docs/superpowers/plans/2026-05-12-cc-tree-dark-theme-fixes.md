# CC-tree UI 暗色主题 + 修复计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 cc-tree 添加暗色主题支持，修复文件名截断和路径重复 bug，添加多彩文档树视觉优化。

**Architecture:** 纯 CSS 暗色主题（prefers-color-scheme）+ 前端显示逻辑修复。scanner.ts 加路径归一化防重复。

**Tech Stack:** CSS variables, vanilla JS, Node.js TypeScript

---

### Task 1: 修复 scanner.ts 路径重复（/ vs \）

**Files:**
- Modify: `src/core/scanner.ts:87-170`

**问题:** fast-glob 返回的路径可能混用 `/` 和 `\`（尤其在 Windows 上），Set 去重时视为不同条目。需要在加入 Set 前统一分隔符。

- [ ] **Step 1: 在 filePaths.add() 前统一路径分隔符**

在 `src/core/scanner.ts` 顶部加入工具函数：

```typescript
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}
```

将所有 `filePaths.add(f)` 和 `filePaths.add(absPath)` 都改为 `filePaths.add(normalizePath(f))` / `filePaths.add(normalizePath(absPath))`。

涉及的位置（共 7 处）：
- 第 99 行：`filePaths.add(f)` → `filePaths.add(normalizePath(f))`
- 第 105 行：`filePaths.add(homeClaude)` → `filePaths.add(normalizePath(homeClaude))`
- 第 126 行：`filePaths.add(rootFile)` → `filePaths.add(normalizePath(rootFile))`
- 第 137 行：`filePaths.add(f)` → `filePaths.add(normalizePath(f))`
- 第 145 行：`filePaths.add(cwdClaude)` → `filePaths.add(normalizePath(cwdClaude))`
- 第 158 行：`filePaths.add(f)` → `filePaths.add(normalizePath(f))`
- 第 168 行：`filePaths.add(f)` → `filePaths.add(normalizePath(f))`
- 第 177 行：`filePaths.add(absPath)` → `filePaths.add(normalizePath(absPath))`
- 第 181 行：`filePaths.add(absPath)` → `filePaths.add(normalizePath(absPath))`

- [ ] **Step 2: 验证构建通过**

```bash
npx tsc --noEmit
```
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add src/core/scanner.ts
git commit -m "fix: normalize path separators to prevent duplicate entries

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: 修复侧栏文件名截断 + 子模块缩进 + 去除重复优先级符号

**Files:**
- Modify: `src/web/app.js:108-125`

**问题:** 
1. 文件名显示的是 `relPath`（如 `.claude\sub\CLAUDE.md`），侧栏宽度有限时 ellipsis 吞掉开头字符，只剩 `AUDE.md`
2. 子模块级文件和项目级文件没有视觉缩进区分
3. 每行同时有 `file-icon`（优先级符号）和文件名旁无额外冗余符号，但当前 `file-icon` 是优先级符号就够了

**修复:** 
- 文件名统一用 basename
- 子模块级根据深度增加 `padding-left`
- 去除 file-item 中多余的符号显示

- [ ] **Step 1: 修改 renderTree() 中文件条目生成逻辑**

将 `src/web/app.js:114-124` 从：

```js
for (const file of group.files) {
  const encodedPath = encodeURIComponent(file.path);
  const name = file.path.split(/[\\/]/).pop();
  const relPath = file.projectPath ? file.path.slice(file.projectPath.length).replace(/^[\\/]+/, '') : name;
  const symbol = PRIORITY_SYMBOLS[file.priority] || '④';
  html += `<div class="file-item" data-path="${encodedPath}" onclick="selectFile(this)">
    <span class="file-icon">${symbol}</span>
    <span class="file-name">${escapeHtml(relPath)}</span>
    <span class="size">${formatSize(file.size)}</span>
  </div>`;
}
```

改为：

```js
for (const file of group.files) {
  const encodedPath = encodeURIComponent(file.path);
  const name = file.path.split(/[\\/]/).pop();
  const relDir = file.projectPath ? file.path.slice(file.projectPath.length).replace(/^[\\/]+/, '') : name;
  const depth = relDir.split(/[\\/]/).filter(Boolean).length - 1;
  const indent = Math.min(Math.max(depth, 0), 3);
  const symbol = PRIORITY_SYMBOLS[file.priority] || '④';
  html += `<div class="file-item" data-path="${encodedPath}" onclick="selectFile(this)" style="padding-left:${20 + indent * 16}px">
    <span class="file-icon">${symbol}</span>
    <span class="file-name">${escapeHtml(name)}</span>
    <span class="size">${formatSize(file.size)}</span>
  </div>`;
}
```

- [ ] **Step 2: 验证构建通过**

```bash
npx tsc --noEmit
```
Expected: 无类型错误（app.js 不是 TS，但确保 serve.ts 能正常加载它）

- [ ] **Step 3: Commit**

```bash
git add src/web/app.js
git commit -m "fix: file name truncation in sidebar and add depth indentation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 暗色主题 + 多彩文档树美化

**Files:**
- Modify: `src/web/index.html`（CSS 部分）

**设计:**
- 暗色主题：用 `@media (prefers-color-scheme: dark)` 媒体查询，纯 CSS 零 JS
- 彩色缩进树：3 个层级分别用蓝/绿/橙作为左侧 3px 彩色竖条，通过 `.file-item` 的 `::before` 伪元素或 `border-left` 实现
- 每个 `.file-item` 左侧根据 `data-level` 显示对应颜色的竖条，配合缩进形成树状结构
- `padding-left` + 彩色竖条 = 清晰的层级视觉

- [ ] **Step 1: 在 CSS 中新增暗色主题变量**

在 `:root` 现有变量后追加暗色 @media：

```css
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1a1a2e;
    --bg-sidebar: #16213e;
    --bg-card: #1a1a2e;
    --border: #2a2a4a;
    --text-primary: #e4e4e7;
    --text-secondary: #a1a1aa;
    --text-tertiary: #71717a;
    --accent: #60a5fa;
    --accent-light: #1e293b;
    --accent-hover: #93bbfc;
    --tag-user: #1e3a5f;
    --tag-user-text: #93c5fd;
    --tag-project: #14532d;
    --tag-project-text: #86efac;
    --tag-sub: #78350f;
    --tag-sub-text: #fdba74;
    --hover-bg: #27272a;
    --active-bg: #1e293b;
    --shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
}
```

- [ ] **Step 2: 添加多彩文档树样式（层级彩色竖条）**

在现有 `.file-item` 相关样式后追加：

```css
/* 文件层级彩色竖条指示器 */
.file-item[data-depth="0"] { border-left: 3px solid #3b82f6; }
.file-item[data-depth="1"] { border-left: 3px solid #22c55e; }
.file-item[data-depth="2"] { border-left: 3px solid #f59e0b; }
.file-item[data-depth="3"] { border-left: 3px solid #a855f7; }

@media (prefers-color-scheme: dark) {
  .file-item[data-depth="0"] { border-left-color: #60a5fa; }
  .file-item[data-depth="1"] { border-left-color: #4ade80; }
  .file-item[data-depth="2"] { border-left-color: #fbbf24; }
  .file-item[data-depth="3"] { border-left-color: #c084fc; }
}

.file-item {
  border-left: 3px solid transparent;
  padding-left: 20px; /* 基础 padding，JS 动态增加的 style padding-left 会覆盖此值 */
  margin: 1px 0;
  transition: background 0.1s;
}
```

- [ ] **Step 3: 在 app.js 的 file-item 中输出 depth 属性**

在 Task 2 修改的基础上，给 `.file-item` 加 `data-depth` 属性：

```js
html += `<div class="file-item" data-path="${encodedPath}" data-depth="${indent}" onclick="selectFile(this)" style="padding-left:${20 + indent * 16}px">
```

- [ ] **Step 4: 验证**

```bash
npx tsc --noEmit
```

然后在浏览器中验证：
- 打开 `cmm serve`，检查浅色主题不受影响
- 切换到系统暗色主题，检查暗色主题正常
- 检查各级文件左侧是否显示对应颜色的竖条

- [ ] **Step 5: Commit**

```bash
git add src/web/index.html src/web/app.js
git commit -m "feat: dark theme support and colored depth indicators

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 最终验证

- [ ] **Step 1: 启动 server**

```bash
npx kill-port 3000 && npx tsx src/cli/index.ts serve
```

- [ ] **Step 2: 浏览器验证清单**
  - 浅色主题正常
  - 系统暗色主题正常切换
  - 侧栏文件名不截断（只显示 basename）
  - 子模块级有缩进 + 彩色竖条
  - 项目筛选功能正常
  - 无路径重复条目
  - 点击文件可正常打开内容

- [ ] **Step 3: 运行测试**

```bash
npx vitest run
```

- [ ] **Step 4: 最终 commit（如有额外修复）**

```bash
git add -A
git commit -m "chore: final adjustments after verification

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 5: 推送到 GitHub**

```bash
git push origin main
```