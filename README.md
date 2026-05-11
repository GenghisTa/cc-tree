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

# JSON 格式输出（始终为 JSON）
cmm list

# 或 scan 命令加 --json
cmm scan --json

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