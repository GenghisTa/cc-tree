const LEVEL_LABELS = { user: '用户级', project: '项目级', submodule: '子模块级' };
const PRIORITY_SYMBOLS = { 1: '①', 2: '②', 3: '③' };
const LEVEL_ORDER = ['user', 'project', 'submodule'];

let scanData = null;

async function loadData() {
  try {
    const res = await fetch('/api/scan');
    scanData = await res.json();
    renderTree(scanData.files);
    renderMergePreview(scanData.mergeContent);
  } catch (err) {
    document.getElementById('tree-container').innerHTML =
      `<div style="color:#f85149;font-size:12px">扫描失败: ${err.message}</div>`;
  }
}

function renderTree(files) {
  const container = document.getElementById('tree-container');
  if (!files || files.length === 0) {
    container.innerHTML = '<div style="color:#8b949e;font-size:12px">未找到 CLAUDE.md 文件</div>';
    return;
  }

  // Group by level
  const groups = {};
  for (const file of files) {
    if (!groups[file.level]) groups[file.level] = [];
    groups[file.level].push(file);
  }

  let html = '';
  for (const level of LEVEL_ORDER) {
    const g = groups[level];
    if (!g || g.length === 0) continue;

    html += `<div class="group-header">📁 ${LEVEL_LABELS[level] || level}<span class="count">${g.length} 个文件</span></div>`;
    for (const file of g) {
      const encodedPath = encodeURIComponent(file.path);
      const symbol = PRIORITY_SYMBOLS[file.priority] || '④';
      html += `<div class="file-item" data-path="${encodedPath}" onclick="selectFile(this)">
        <span class="priority">${symbol}</span>
        ${file.path.split(/[\\/]/).pop()}
        <span class="size">${formatSize(file.size)}</span>
      </div>`;
    }
  }

  container.innerHTML = html;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function selectFile(el) {
  // Update active state
  document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');

  const path = decodeURIComponent(el.dataset.path);
  const file = scanData.files.find(f => f.path === path);
  if (!file) return;

  const main = document.getElementById('main-panel');
  const headingsHtml = file.headings.map(h => `<div style="color:#8b949e;font-size:11px">${h}</div>`).join('');

  main.innerHTML = `
    <div class="preview-header">
      <span>${file.path.split(/[\\/]/).pop()}</span>
      <div class="actions">
        <button class="btn" onclick="copyPath('${encodeURIComponent(file.path)}')">📋 复制路径</button>
      </div>
    </div>
    <div class="path-text">${file.path}</div>
    <div style="margin-bottom:12px;font-size:11px;color:#8b949e">
      优先级: <span style="color:#e3b341">${PRIORITY_SYMBOLS[file.priority] || '④'}</span>
      &nbsp;|&nbsp; 大小: ${formatSize(file.size)}
      &nbsp;|&nbsp; 标题: ${file.headings.length} 个
    </div>
    <div class="content-preview">
      <div style="color:#8b949e;font-size:11px;margin-bottom:6px">--- 内容预览 ---</div>
      ${escapeHtml(file.content)}
    </div>
    <div class="merge-section">
      <h3>📋 合并预览</h3>
      <div class="merge-content">${renderMergePreviewHtml()}</div>
    </div>
  `;
}

function renderMergePreviewHtml() {
  if (!scanData) return '';
  const priorityLabels = { 1: '① 用户级', 2: '② 项目级', 3: '③ 子模块级' };
  let html = '';
  for (const file of scanData.files) {
    const label = priorityLabels[file.priority] || '④ 其他';
    html += `<div class="file-sep">--- ${label}: ${file.path.split(/[\\/]/).pop()} ---</div>\n`;
    html += escapeHtml(file.content.split('\n').slice(0, 8).join('\n')) + '\n';
  }
  return html;
}

function renderMergePreview(content) {
  const main = document.getElementById('main-panel');
  main.innerHTML = `
    <div class="merge-section">
      <h3>📋 合并预览 — 所有规则按加载顺序拼接</h3>
      <div class="merge-content">${escapeHtml(content)}</div>
    </div>
  `;
}

function copyPath(encodedPath) {
  const path = decodeURIComponent(encodedPath);
  navigator.clipboard.writeText(path).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Init
loadData();