const LEVEL_CONFIG = {
  user:     { label: '用户级',   icon: '👤',  tagClass: 'tag-user' },
  project:  { label: '项目级',   icon: '📁',  tagClass: 'tag-project' },
  submodule:{ label: '子模块级', icon: '📂',  tagClass: 'tag-sub' },
};
const PRIORITY_SYMBOLS = { 1: '①', 2: '②', 3: '③' };
const LEVEL_ORDER = ['user', 'project', 'submodule'];

let scanData = null;
let currentFilter = '';
let currentView = 'overview';

async function loadData() {
  const statusEl = document.getElementById('status');
  statusEl.textContent = '扫描中...';
  try {
    const params = new URLSearchParams();
    const filter = document.getElementById('project-filter').value;
    currentFilter = filter;
    if (filter) params.set('project', filter);
    const res = await fetch(`/api/scan?${params.toString()}`);
    scanData = await res.json();
    renderTree(scanData.files);
    populateProjectFilter(scanData.projects);
    statusEl.textContent = `${scanData.files.length} 个文件`;
    document.getElementById('total-count').textContent = `共 ${scanData.files.length} 个`;
    document.getElementById('header-subtitle').textContent = filter
      ? `项目: ${filter} — ${scanData.files.length} 个 CLAUDE.md 文件`
      : `全局扫描 — ${scanData.files.length} 个 CLAUDE.md 文件`;
    renderOverview();
  } catch (err) {
    document.getElementById('tree-container').innerHTML =
      `<div style="color:#dc2626;font-size:13px;padding:8px">扫描失败: ${err.message}</div>`;
    statusEl.textContent = '扫描失败';
  }
}

function onProjectFilterChange() {
  loadData();
}

function populateProjectFilter(projects) {
  const select = document.getElementById('project-filter');
  const currentVal = select.value;
  // Only update options if projects list changed
  const existing = new Set();
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value) existing.add(select.options[i].value);
  }
  let changed = false;
  if (projects) {
    for (const p of projects) {
      if (!existing.has(p)) { changed = true; break; }
    }
    if (projects.length !== existing.size) changed = true;
  }
  if (!changed) return;

  select.innerHTML = '<option value="">所有项目</option>';
  if (projects) {
    for (const p of projects) {
      const name = p.split(/[\\/]/).pop() || p;
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = `${name} (${p})`;
      select.appendChild(opt);
    }
  }
  select.value = currentVal || '';
}

function showOverview() {
  currentView = 'overview';
  renderOverview();
}

function renderOverview() {
  const main = document.getElementById('main-panel');
  const files = scanData.files;
  if (!files || files.length === 0) {
    main.innerHTML = '<div class="main-empty"><div class="empty-icon">📄</div><div>未找到 CLAUDE.md 文件</div></div>';
    return;
  }

  const userFiles = files.filter(f => f.level === 'user' || (!f.projectPath && f.priority === 1));
  const projectFiles = files.filter(f => f.level !== 'user' && f.projectPath);

  const projects = {};
  for (const f of projectFiles) {
    const key = f.projectPath || '__other';
    if (!projects[key]) {
      projects[key] = { path: key, name: f.projectName || key.split(/[\\/]/).pop(), files: [], totalSize: 0 };
    }
    projects[key].files.push(f);
    projects[key].totalSize += f.size;
  }

  const projectKeys = Object.keys(projects).sort();
  const totalSize = files.reduce((s, f) => s + f.size, 0);
  const userTotalSize = userFiles.reduce((s, f) => s + f.size, 0);

  let html = '<div class="overview-container">';

  // === Root node ===
  html += '<div class="tree-root">📄 全部 CLAUDE.md <span class="tree-root-count">' + files.length + ' 个文件 · ' + formatSize(totalSize) + '</span></div>';

  // === Level 1 branch connectors: root splits into two ===
  html += '<div class="tree-split">';
  html += '<div class="tree-split-line"></div>';
  html += '</div>';

  // === Level 2: two cards side by side (user level + project level) ===
  html += '<div class="tree-level-2">';

  // User level card
  html += '<div class="tree-level-2-item">';
  html += '<div class="tree-connector-down"></div>';
  html += '<div class="tree-card tree-card-user"><div class="tree-card-name">👤 用户级</div><div class="tree-card-meta">' + userFiles.length + ' 个文件 · ' + formatSize(userTotalSize) + '</div></div>';
  // User file children
  if (userFiles.length > 0) {
    html += '<div class="tree-level-3">';
    for (const f of userFiles) {
      const name = f.path.split(/[\\/]/).pop();
      html += '<div class="tree-level-3-item"><div class="tree-connector-down-short"></div><div class="tree-card tree-card-file tree-depth-0" onclick="selectFileByPath(\'' + encodeURIComponent(f.path) + '\')"><span class="tree-card-name">' + (PRIORITY_SYMBOLS[f.priority] || '④') + ' ' + escapeHtml(name) + '</span><span class="tree-card-meta">' + formatSize(f.size) + '</span></div></div>';
    }
    html += '</div>';
  }
  html += '</div>';

  // Project level card
  html += '<div class="tree-level-2-item">';
  html += '<div class="tree-connector-down"></div>';
  html += '<div class="tree-card tree-card-project" style="cursor:default"><div class="tree-card-name">📁 项目级</div><div class="tree-card-meta">' + projectKeys.length + ' 个项目 · ' + projectFiles.length + ' 个文件</div></div>';
  // Project children
  if (projectKeys.length > 0) {
    html += '<div class="tree-level-3">';
    for (const key of projectKeys) {
      const proj = projects[key];
      const subFiles = proj.files.filter(f => f.level === 'submodule' || f.priority === 3);
      const rootFiles = proj.files.filter(f => f.level !== 'submodule' && f.priority !== 3);
      html += '<div class="tree-level-3-item"><div class="tree-connector-down-short"></div><div class="tree-card tree-card-project-item tree-depth-1"><div class="tree-card-name">📂 ' + escapeHtml(proj.name) + '</div><div class="tree-card-meta">' + formatSize(proj.totalSize) + '</div></div>';
      // Submodule children (level 4)
      if (subFiles.length > 0) {
        html += '<div class="tree-level-4">';
        for (let i = 0; i < Math.min(subFiles.length, 8); i++) {
          const sf = subFiles[i];
          html += '<div class="tree-level-4-item"><div class="tree-connector-down-short"></div><div class="tree-card tree-card-file tree-depth-2" onclick="selectFileByPath(\'' + encodeURIComponent(sf.path) + '\')"><span class="tree-card-name">' + (PRIORITY_SYMBOLS[sf.priority] || '④') + ' ' + escapeHtml(sf.path.split(/[\\/]/).pop()) + '</span><span class="tree-card-meta">' + formatSize(sf.size) + '</span></div></div>';
        }
        if (subFiles.length > 8) {
          html += '<div class="tree-level-4-item"><div class="tree-connector-down-short"></div><div class="tree-card-more">... 还有 ' + (subFiles.length - 8) + ' 个文件</div></div>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
  }
  html += '</div>';

  html += '</div>'; // tree-level-2
  html += '</div>'; // overview-container
  main.innerHTML = html;
}

function renderTree(files) {
  const container = document.getElementById('tree-container');
  if (!files || files.length === 0) {
    container.innerHTML = '<div style="color:var(--text-tertiary);font-size:13px;padding:8px">未找到 CLAUDE.md 文件</div>';
    return;
  }

  // Separate user-level from project-scoped files
  const userFiles = files.filter(f => f.level === 'user' || (!f.projectPath && f.priority === 1));
  const projectFiles = files.filter(f => f.level !== 'user' && f.projectPath);

  // Group project files by projectPath
  const projectGroups = {};
  for (const file of projectFiles) {
    const key = file.projectPath || '__other';
    if (!projectGroups[key]) projectGroups[key] = { path: key, name: file.projectName || key.split(/[\\/]/).pop(), files: [] };
    projectGroups[key].files.push(file);
  }

  let html = '';

  // Render user-level files first
  if (userFiles.length > 0) {
    html += `<div class="project-group">
      <div class="project-group-title">👤 全局规则 <span class="project-count">${userFiles.length}</span></div>`;
    for (const file of userFiles) {
      const encodedPath = encodeURIComponent(file.path);
      const name = file.path.split(/[\\/]/).pop();
      const symbol = PRIORITY_SYMBOLS[file.priority] || '④';
      html += `<div class="file-item" data-path="${encodedPath}" data-depth="0" onclick="selectFile(this)">
        <span class="file-icon">${symbol}</span>
        <span class="file-name">${name}</span>
        <span class="size">${formatSize(file.size)}</span>
      </div>`;
    }
    html += `</div>`;
  }

  // Render each project as a group
  const projectKeys = Object.keys(projectGroups).sort();
  for (const key of projectKeys) {
    const group = projectGroups[key];
    html += `<div class="project-group">
      <div class="project-group-title">📁 ${escapeHtml(group.name)} <span class="project-count">${group.files.length}</span></div>`;
    for (const file of group.files) {
      const encodedPath = encodeURIComponent(file.path);
      const name = file.path.split(/[\\/]/).pop();
      const relDir = file.projectPath ? file.path.slice(file.projectPath.length).replace(/^[\\/]+/, '') : name;
      const depth = relDir.split(/[\\/]/).filter(Boolean).length;
      const displayDepth = file.priority === 2 ? 1 : (file.priority === 3 ? 2 : Math.min(depth, 3));
      const symbol = PRIORITY_SYMBOLS[file.priority] || '④';
      html += `<div class="file-item" data-path="${encodedPath}" data-depth="${displayDepth}" onclick="selectFile(this)" style="padding-left:${12 + displayDepth * 12}px">
        <span class="file-icon">${symbol}</span>
        <span class="file-name">${escapeHtml(name)}</span>
        <span class="size">${formatSize(file.size)}</span>
      </div>`;
    }
    html += `</div>`;
  }

  container.innerHTML = html;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function selectFile(el) {
  document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  const path = decodeURIComponent(el.dataset.path);
  const file = scanData.files.find(f => f.path === path);
  if (!file) return;
  currentView = 'detail-' + path;
  showFileDetail(file);
}

function selectFileByPath(encodedPath) {
  if (!encodedPath) return;
  const path = decodeURIComponent(encodedPath);
  const file = scanData.files.find(f => f.path === path);
  if (!file) return;

  document.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'));
  const sidebarItem = document.querySelector('.file-item[data-path="' + encodeURIComponent(path) + '"]');
  if (sidebarItem) sidebarItem.classList.add('active');

  currentView = 'detail-' + path;
  showFileDetail(file);
}

function showFileDetail(file) {
  const main = document.getElementById('main-panel');
  const name = file.path.split(/[\\/]/).pop();
  const cfg = LEVEL_CONFIG[file.level] || {};

  // Build heading tree
  const headingHtml = file.headings.length > 0
    ? file.headings.map(h => {
        const match = h.match(/^(\s*)- (.+)/);
        const indent = match ? Math.floor(match[1].length / 2) : 0;
        const text = match ? match[2] : h;
        return `<div class="heading-line level-${Math.min(indent + 1, 4)}">${'  '.repeat(indent)}${'#'.repeat(indent + 1)} ${escapeHtml(text)}</div>`;
      }).join('')
    : '<div style="color:var(--text-tertiary)">（无标题）</div>';

  // Build merge preview for all files
  const mergeHtml = scanData.files.map(f => {
    const label = PRIORITY_SYMBOLS[f.priority] || '④';
    const fName = f.path.split(/[\\/]/).pop();
    const lines = f.content.split('\n');
    const snip = lines.slice(0, 6).join('\n');
    return `<div class="merge-entry">
      <div class="merge-file-label">${label} ${escapeHtml(fName)} — ${escapeHtml(f.path)}</div>
      <div class="merge-content-snip">${escapeHtml(snip)}</div>
      ${lines.length > 6 ? `<div class="merge-more">... 还有 ${lines.length - 6} 行</div>` : ''}
    </div>`;
  }).join('');

  const projectTag = file.projectPath
    ? `<span class="tag" style="background:#f3f4f6;color:#374151">📁 ${escapeHtml(file.projectName || file.projectPath)}</span>`
    : '';

  main.innerHTML = `
    <div class="preview-header">
      <div>
        <div class="file-title">${escapeHtml(name)}</div>
        <div class="file-path">${escapeHtml(file.path)}</div>
      </div>
      <div class="actions">
        <button class="btn" onclick="showOverview()">← 返回总览</button>
        <button class="btn" onclick="copyPath('${encodeURIComponent(file.path)}')">复制路径</button>
        <button class="btn btn-primary" onclick="openFile('${encodeURIComponent(file.path)}')">编辑</button>
      </div>
    </div>

    <div class="meta-row">
      ${projectTag}
      <span class="tag ${cfg.tagClass || ''}">${cfg.icon || ''} ${cfg.label || file.level}</span>
      <span class="tag" style="background:#f3f4f6;color:#374151">优先级 ${PRIORITY_SYMBOLS[file.priority] || file.priority}</span>
      <span class="tag" style="background:#f3f4f6;color:#374151">${formatSize(file.size)}</span>
      <span class="tag" style="background:#f3f4f6;color:#374151">${file.headings.length} 个标题</span>
    </div>

    <div class="section">
      <div class="section-header">📋 标题大纲</div>
      <div class="section-body">${headingHtml}</div>
    </div>

    <div class="section">
      <div class="section-header">📝 内容预览</div>
      <div class="section-body mono">${escapeHtml(file.content)}</div>
    </div>

    <div class="section">
      <div class="section-header">📎 合并预览（按加载顺序）</div>
      <div class="section-body">${mergeHtml}</div>
    </div>
  `;
}

function copyPath(encodedPath) {
  const path = decodeURIComponent(encodedPath);
  navigator.clipboard.writeText(path).then(() => {
    showToast('已复制到剪贴板', 'success');
  });
}

function showToast(msg, type) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast show toast-${type}`;
  setTimeout(() => toast.classList.remove('show'), 2000);
}

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

// ===== Theme toggle: light → dark → system =====
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme') || 'system';
  const next = current === 'light' ? 'dark' : (current === 'dark' ? 'system' : 'light');
  applyTheme(next);
}

function applyTheme(theme) {
  const html = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  if (theme === 'system') {
    html.removeAttribute('data-theme');
    localStorage.removeItem('cc-tree-theme');
    btn.textContent = '💻';
    btn.title = '跟随系统';
  } else {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('cc-tree-theme', theme);
    btn.textContent = theme === 'light' ? '🌞' : '🌜';
    btn.title = theme === 'light' ? '浅色主题' : '深色主题';
  }
}

// Init theme from localStorage
(function initTheme() {
  const saved = localStorage.getItem('cc-tree-theme');
  if (saved) applyTheme(saved);
})();

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadData();