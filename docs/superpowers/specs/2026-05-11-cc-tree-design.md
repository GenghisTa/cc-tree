# CC-tree (Claude Memory Hub) 设计文档

## 概述

CC-tree 是一个轻量级 CLI + Web 工具，用于统一管理和可视化当前工作路径下的 CLAUDE.md 文件层级结构。它的核心定位是 **"上下文地图"**——让用户一目了然地看到 Claude Code 在当前工作路径下受到哪些规则约束，以及这些规则的层级关系和优先级顺序。

## 目标用户

- **主要用户**：Claude Code 使用者（包括技术用户和非技术用户）
- **使用场景**：想了解当前项目受哪些 CLAUDE.md 规则约束、快速定位并编辑这些文件

## 核心功能（MVP）

### 1. 全局发现引擎

- 递归扫描以下路径下的 `CLAUDE.md` 文件：
  - 用户级：`~/.claude/` 目录
  - 项目级：当前工作目录 (`cwd`) 根目录
  - 子模块级：`cwd` 下所有子目录（含 `.claude/` 子目录）
- 支持 `--depth` 参数控制递归深度（默认 5）
- 支持自定义扩展路径扫描

### 2. 上下文地图（核心）

扫描结果以 **层级树 + 内容预览** 展示：

- **层级分组**：按「用户级 — 项目级 — 子模块级」分组
- **优先级标注**：每个文件标注加载优先级序号（① ② ③）
- **覆盖关系指示**：子级文件覆盖父级同名配置
- **内容预览**：提取每个文件的一级标题大纲，快速了解内容
- **合并预览**：按优先级顺序拼接所有规则，展示"本地合并效果"

### 3. 编辑器联动

- 默认：使用操作系统默认的 `.md` 文件关联程序打开
- 可配置：通过 `cmm config set editor <command>` 自定义编辑器命令
- 辅助功能：「复制路径」「在文件管理器中显示」

### 4. 三种交互模式

#### CLI 模式 (`cmm scan`)

终端输出彩色树形图，适合快速查看：

```
📁 用户级  (~/.claude/)
  └── CLAUDE.md                  ①
📁 项目级  (./)
  ├── CLAUDE.md                  ②
  └── docs/
      └── CLAUDE.md              ③
```

#### Web 模式 (`cmm serve`)

启动本地 Web 界面，左侧层级树 + 右侧文件内容/大纲预览，鼠标点击操作。

```
┌─────────────────────────────────────────────────┐
│           Claude 上下文地图                       │
├──────────────┬──────────────────────────────────┤
│  📁 层级树     │ 文件内容 / 大纲                 │
│              │                                  │
│  ① 用户级     │ # 工作环境                      │
│   └── CLAUDE.md│ ## 环境配置                    │
│  ② 项目级     │ - 用户主目录                    │
│   ├── CLAUDE.md│ - API 后端                     │
│   └── .claude/ │                                │
│       └── ...  │ [📝 编辑] [📋 复制路径]         │
│  ③ 子模块     │                                │
│   └── docs/    │ 合并预览 ↓                     │
│       └── ...  │════════════════════            │
└──────────────┴──────────────────────────────────┘
```

#### JSON 模式 (`cmm list --json`)

结构化输出，供其他工具或脚本调用。

## 技术方案

### 技术栈

| 层面 | 技术 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，你已熟悉 JS 生态 |
| CLI 框架 | `commander` | 成熟的 CLI 参数解析 |
| 终端彩色输出 | `chalk` | 跨平台彩色文本 |
| Web 界面 | Vite + vanilla HTML/JS | 轻量，无需学习前端框架 |
| 文件扫描 | `fast-glob` | 高效递归文件匹配 |
| 配置管理 | Node.js `fs` + JSON | 零依赖 |

### 项目结构

```
D:\Project\cc-tree\
├── src/
│   ├── core/           # 核心引擎
│   │   ├── scanner.ts      # 文件扫描
│   │   ├── parser.ts       # CLAUDE.md 解析（提取大纲）
│   │   └── types.ts        # 类型定义
│   ├── cli/            # CLI 入口
│   │   ├── index.ts        # 主入口 + commander 配置
│   │   ├── scan.ts         # scan 命令处理
│   │   ├── serve.ts        # serve 命令处理
│   │   └── render.ts       # 终端树形渲染
│   ├── web/            # Web 界面
│   │   ├── index.html      # 主页面
│   │   └── app.js          # 前端交互逻辑
│   └── config/         # 配置管理
│       └── config.ts       # 读写用户配置
├── package.json
├── tsconfig.json
└── README.md
```

### 命令设计

| 命令 | 功能 | 示例 |
|------|------|------|
| `cmm scan` | 扫描并终端输出树 | `cmm scan --depth 3` |
| `cmm serve` | 启动 Web 界面 | `cmm serve --port 3000` |
| `cmm list --json` | JSON 格式输出 | `cmm list --json` |
| `cmm config set` | 配置编辑器等 | `cmm config set editor typora` |
| `cmm config get` | 查看当前配置 | `cmm config get` |
| `cmm --help` | 帮助 | `cmm --help` |

## 配置系统

用户配置文件：`~/.claude-cc/config.json`

```json
{
  "editor": "default",
  "scanDepth": 5,
  "port": 3000
}
```

## 后续迭代（非 MVP）

- 指令模板市场（分享常用 CLAUDE.md 模板）
- Token 估算（估算当前规则占用的 token 量）
- 跨项目对比（对比两个项目的规则差异）
- 图形化规则编辑器（可视化编辑 CLAUDE.md，自动保存）