# CC-tree — CLAUDE.md 上下文地图

CLAUDE.md 是 Claude Code 项目的核心配置文件。随着项目增多，你可能会散落多个 CLAUDE.md 文件在  `~/.claude/`、各个项目根目录和子目录中。CC-tree 帮你把所有这些文件扫描汇总，形成一张**结构化的层级地图**，让你一眼看清每个文件的位置、优先级和内容概览，并可以一键跳转编辑。

## 核心功能

- **全局扫描** — 自动发现所有项目下的 CLAUDE.md，按用户级 → 项目级 → 子模块级组织
- **Web 可视化** — 浏览器中查看文件层级树、树形总览图、标题大纲和内容预览
- **合并预览** — 直观展示多个 CLAUDE.md 合并后的完整内容
- **一键编辑** — 支持跳转到 Obsidian、Typora、VS Code 等外部编辑器
- **主题切换** — 浅色/深色/跟随系统，三态循环
- **项目筛选** — 按项目过滤，只看某个项目下的文件

## 安装

```bash
npm install -g cmm
```

## 使用

### Web 界面（推荐）

```bash
cmm serve
# 打开浏览器访问 http://localhost:3000
```

Web 界面功能：
- 左侧侧栏：按层级分组展示所有文件（背景色表示深度）
- 右侧首页：树形总览图，从根节点向下分叉展示层级关系
- 点击文件查看详情：标签行、标题大纲、内容预览、合并预览
- 点击"编辑"按钮跳转到外部编辑器

### 命令行扫描

```bash
# 终端树形展示
cmm scan

# JSON 格式输出
cmm scan --json

# 显示合并预览
cmm scan --merge

# 仅扫描当前目录（不全局扫描）
cmm scan --local

# 按项目筛选
cmm scan --project /path/to/project

# 控制递归深度
cmm scan --depth 3

# 用编辑器打开指定文件
cmm scan --open ~/.claude/CLAUDE.md
```

### 配置编辑器

```bash
# 查看当前配置
cmm config get

# 使用默认编辑器
cmm config set editor default

# 使用 Typora
cmm config set editor typora

# 使用 VS Code
cmm config set editor "code -w %f"

# 使用 Obsidian
cmm config set editor "obsidian://open?vault=myvault&file=%f"
```

## 文件层级与优先级

CLAUDE.md 加载时按优先级从低到高合并，同名的配置项会被高优先级覆盖：

| 层级 | 位置 | 优先级 |
|------|------|--------|
| 用户级 | `~/.claude/`、`~/CLAUDE.md` | ① 最低（基准规则） |
| 项目级 | `项目根目录/CLAUDE.md` 或 `.claude/CLAUDE.md` | ② 项目级规则 |
| 子模块级 | `项目根目录/子目录/CLAUDE.md` | ③ 最高（覆盖上层） |

**加载顺序**：用户级 → 项目级 → 子模块级，后加载的覆盖前面的同名配置。

## 配置

配置文件位于 `~/.claude-cc/config.json`：

```json
{
  "editor": "default",
  "scanDepth": 5,
  "port": 3000
}
```

- `editor` — 打开文件时使用的编辑器命令
- `scanDepth` — 扫描递归深度（默认 5）
- `port` — Web 服务端口（默认 3000）

## Web UI 使用提示

- **侧栏文件列表**：不同背景色表示不同层级（蓝=用户级，黄=项目级，紫=子模块级）
- **树形总览图**：右侧首页默认展示从上往下的层级树，点击卡片进入详情
- **文件详情页**：查看标题大纲、内容预览和全局合并预览，点击"返回总览"回到首页
- **主题切换**：点击顶部的 💻/🌞/🌜 按钮，在"跟随系统"、"浅色"、"深色"间循环切换，偏好会保存

## 颜色图例

| 颜色 | 含义 |
|------|------|
| 蓝色 | 用户级（~/.claude/ 等） |
| 黄色 | 项目级（项目根目录） |
| 紫色 | 子模块级（项目子目录） |
| 粉色 | 深层嵌套 |

## 许可证

MIT