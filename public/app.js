let allPrompts = [];
let currentDetailPrompt = null;
let currentVersionIndex = 0;

// ===== API Helper =====
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ===== Toast Notifications =====
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  
  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };
  
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || ''}</span>
    <span>${message}</span>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ===== Load & Render =====
async function loadPrompts() {
  try {
    allPrompts = await api('/api/prompts');
    renderPrompts(allPrompts);
    loadStats();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function loadStats() {
  try {
    const stats = await api('/api/stats');
    const bar = document.getElementById('statsBar');
    bar.innerHTML = `
      <div class="stat-item">
        <span class="stat-value">${stats.totalPrompts}</span>
        <span class="stat-label">Prompts</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${stats.totalVersions}</span>
        <span class="stat-label">Versions</span>
      </div>
      ${Object.entries(stats.categories).map(([cat, count]) => `
        <div class="stat-item">
          <span class="stat-value">${count}</span>
          <span class="stat-label">${cat}</span>
        </div>
      `).join('')}
    `;
  } catch (e) { /* ignore */ }
}

function renderPrompts(prompts) {
  const grid = document.getElementById('promptGrid');
  if (prompts.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <h2>No prompts yet</h2>
        <p>Create your first prompt to get started with version control.</p>
        <button class="btn btn-primary" onclick="openCreateModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 5v14M5 12h14"/></svg>
          Create Your First Prompt
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = prompts.map(p => {
    const latest = p.versions[p.versions.length - 1];
    const rating = latest?.performance?.rating;
    const tags = p.tags || [];
    return `
      <div class="prompt-card" onclick="openDetail('${p.id}')">
        <div class="card-actions">
          <button class="card-action-btn" onclick="event.stopPropagation(); copyToClipboard('${esc(latest?.content || '')}')" title="Copy prompt">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
          </button>
        </div>
        <div class="card-header">
          <span class="card-name">${esc(p.name)}</span>
          <span class="card-category cat-${p.category}">${esc(p.category)}</span>
        </div>
        <div class="card-description">${esc(p.description || 'No description')}</div>
        ${tags.length > 0 ? `
          <div class="card-tags">
            ${tags.slice(0, 3).map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}
            ${tags.length > 3 ? `<span class="card-tag">+${tags.length - 3}</span>` : ''}
          </div>
        ` : ''}
        <div class="card-meta">
          <span class="card-versions">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M6 20V4M18 20v-6"/></svg>
            ${p.versions.length} version${p.versions.length !== 1 ? 's' : ''}
          </span>
          ${rating ? `<span class="card-rating">${'⭐'.repeat(rating)}</span>` : ''}
        </div>
        ${latest?.content ? `<div class="card-preview">${esc(latest.content)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ===== Modal Management =====
function openCreateModal() {
  document.getElementById('createForm').reset();
  document.getElementById('createCharCount').textContent = '0 characters';
  clearModelPresets('create');
  openModal('createModal');
  setTimeout(() => document.querySelector('#createForm input[name="name"]').focus(), 100);
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
  // Escape to close modals
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    return;
  }
  
  // Cmd/Ctrl + K for search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
    document.getElementById('searchInput').select();
    return;
  }
  
  // Cmd/Ctrl + N for new prompt
  if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
    e.preventDefault();
    openCreateModal();
    return;
  }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// ===== Copy to Clipboard =====
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard!', 'success');
  } catch (e) {
    toast('Failed to copy', 'error');
  }
}

// ===== Character Counter =====
function setupCharCounter(textareaId, counterId) {
  const textarea = document.getElementById(textareaId);
  const counter = document.getElementById(counterId);
  
  if (!textarea || !counter) return;
  
  const updateCount = () => {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString()} character${len !== 1 ? 's' : ''}`;
  };
  
  textarea.addEventListener('input', updateCount);
  updateCount();
}

// ===== Model Presets =====
function setModel(btn, model) {
  const input = document.getElementById('createModel');
  input.value = model;
  
  // Update active state
  btn.parentElement.querySelectorAll('.model-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function setModelVersion(btn, model) {
  const input = document.getElementById('versionModel');
  input.value = model;
  
  btn.parentElement.querySelectorAll('.model-preset').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function clearModelPresets(formType) {
  const container = formType === 'create' ? 
    document.querySelector('#createForm .model-presets') :
    document.querySelector('#versionForm .model-presets');
  
  if (container) {
    container.querySelectorAll('.model-preset').forEach(b => b.classList.remove('active'));
  }
}

// ===== Create Prompt =====
async function handleCreate(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  
  // Get selected model preset
  const activePreset = document.querySelector('#createForm .model-preset.active');
  const modelInput = document.getElementById('createModel');
  
  // Parse tags
  const tagsStr = fd.get('tags') || '';
  const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
  
  try {
    await api('/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: fd.get('name'),
        description: fd.get('description'),
        category: fd.get('category'),
        content: fd.get('content'),
        tags: tags,
        model: activePreset?.textContent || modelInput?.value || null,
      }),
    });
    closeModal('createModal');
    toast('Prompt created!', 'success');
    loadPrompts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== Detail View =====
async function openDetail(id) {
  try {
    const prompt = await api(`/api/prompts/${id}`);
    currentDetailPrompt = prompt;
    currentVersionIndex = prompt.versions.length - 1;
    renderDetail();
    openModal('detailModal');
  } catch (e) {
    toast(e.message, 'error');
  }
}

function renderDetail() {
  const p = currentDetailPrompt;
  const v = p.versions[currentVersionIndex];
  document.getElementById('detailTitle').textContent = p.name;

  const tags = p.tags || [];
  
  document.getElementById('detailContent').innerHTML = `
    <div class="detail-body">
      <div class="detail-info">
        <div class="detail-info-item">
          <div class="detail-info-label">Category</div>
          <div class="detail-info-value">${esc(p.category)}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Created</div>
          <div class="detail-info-value">${new Date(p.createdAt).toLocaleDateString()}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Versions</div>
          <div class="detail-info-value">${p.versions.length}</div>
        </div>
        <div class="detail-info-item">
          <div class="detail-info-label">Description</div>
          <div class="detail-info-value">${esc(p.description || 'None')}</div>
        </div>
        ${tags.length > 0 ? `
          <div class="detail-info-item">
            <div class="detail-info-label">Tags</div>
            <div class="detail-info-value">${tags.map(t => esc(t)).join(', ')}</div>
          </div>
        ` : ''}
      </div>

      <div class="detail-actions">
        <button class="btn btn-primary btn-sm" onclick="openVersionModal('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>
          Add Version
        </button>
        ${p.versions.length >= 2 ? `
          <button class="btn btn-secondary btn-sm" onclick="openDiffModal('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>
            Compare Versions
          </button>
        ` : ''}
        <button class="btn btn-danger btn-sm" onclick="deletePrompt('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
          Delete
        </button>
      </div>

      <div class="version-tabs">
        ${p.versions.map((ver, i) => `
          <button class="version-tab ${i === currentVersionIndex ? 'active' : ''}"
            onclick="switchVersion(${i})">
            v${ver.version}
            ${ver.performance?.rating ? ' ⭐' + ver.performance.rating : ''}
          </button>
        `).join('')}
      </div>

      <div class="version-content-wrapper">
        <div class="version-content">${highlightVariables(esc(v.content || '(empty)'))}</div>
        <button class="copy-btn" onclick="copyToClipboard(\`${esc(v.content || '').replace(/`/g, '\\`').replace(/\n/g, '\\n')}\`)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          Copy
        </button>
      </div>

      <div class="version-meta">
        <span class="version-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
          ${new Date(v.createdAt).toLocaleString()}
        </span>
        ${v.metadata?.notes ? `
          <span class="version-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            ${esc(v.metadata.notes)}
          </span>
        ` : ''}
        ${v.metadata?.model ? `
          <span class="version-meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 12h6M9 15h3"/></svg>
            ${esc(v.metadata.model)}
          </span>
        ` : ''}
      </div>

      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border);">
        <span style="font-size: 0.85rem; color: var(--text-muted); margin-right: 12px;">Rate this version:</span>
        <span class="rating-stars">
          ${[1,2,3,4,5].map(r => `
            <span class="star" onclick="rateVersion('${p.id}', ${v.version}, ${r})"
              style="color: ${r <= (v.performance?.rating || 0) ? 'var(--warning)' : 'var(--text-dim)'}; cursor: pointer;">★</span>
          `).join('')}
        </span>
      </div>
    </div>
  `;
}

// Highlight {{variables}} in prompt content
function highlightVariables(text) {
  return text.replace(/\{\{([^}]+)\}\}/g, '<span class="var-highlight">{{$1}}</span>');
}

function switchVersion(index) {
  currentVersionIndex = index;
  renderDetail();
}

// ===== Add Version =====
function openVersionModal(promptId) {
  document.getElementById('versionPromptId').value = promptId;
  document.getElementById('versionForm').reset();
  document.getElementById('versionPromptId').value = promptId;
  document.getElementById('versionCharCount').textContent = '0 characters';
  clearModelPresets('version');
  openModal('versionModal');
  setTimeout(() => document.querySelector('#versionForm textarea').focus(), 100);
}

async function handleAddVersion(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const promptId = fd.get('promptId');
  
  // Get selected model preset
  const activePreset = document.querySelector('#versionForm .model-preset.active');
  const modelInput = document.getElementById('versionModel');
  
  try {
    await api(`/api/prompts/${promptId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        content: fd.get('content'),
        notes: fd.get('notes'),
        model: activePreset?.textContent || modelInput?.value || null,
      }),
    });
    closeModal('versionModal');
    toast('Version added!', 'success');
    loadPrompts();
    const prompt = await api(`/api/prompts/${promptId}`);
    currentDetailPrompt = prompt;
    currentVersionIndex = prompt.versions.length - 1;
    renderDetail();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== Rating =====
async function rateVersion(promptId, version, rating) {
  try {
    await api(`/api/prompts/${promptId}/versions/${version}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
    toast(`Rated v${version}: ${'★'.repeat(rating)}`, 'success');
    const prompt = await api(`/api/prompts/${promptId}`);
    currentDetailPrompt = prompt;
    renderDetail();
    loadPrompts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== Delete =====
async function deletePrompt(id) {
  if (!confirm('Are you sure you want to delete this prompt? This cannot be undone.')) return;
  try {
    await api(`/api/prompts/${id}`, { method: 'DELETE' });
    closeModal('detailModal');
    toast('Prompt deleted', 'info');
    loadPrompts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== Diff Comparison =====
function openDiffModal(promptId) {
  const p = currentDetailPrompt;
  const diffContent = document.getElementById('diffContent');
  diffContent.innerHTML = `
    <div class="diff-container">
      <div class="diff-selectors">
        <span style="color: var(--text-muted); font-size: 0.85rem;">Compare</span>
        <select id="diffV1">
          ${p.versions.map(v => `<option value="${v.version}" ${v.version === 1 ? 'selected' : ''}>v${v.version}</option>`).join('')}
        </select>
        <span style="color: var(--text-muted);">with</span>
        <select id="diffV2">
          ${p.versions.map(v => `<option value="${v.version}" ${v.version === p.versions.length ? 'selected' : ''}>v${v.version}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="runDiff('${promptId}')">Compare</button>
      </div>
      <div class="diff-output" id="diffOutput">
        <span style="color: var(--text-dim);">Select versions and click Compare</span>
      </div>
    </div>
  `;
  openModal('diffModal');
}

async function runDiff(promptId) {
  const v1 = document.getElementById('diffV1').value;
  const v2 = document.getElementById('diffV2').value;
  try {
    const result = await api(`/api/prompts/${promptId}/compare/${v1}/${v2}`);
    const output = document.getElementById('diffOutput');
    const lines1 = result.v1.content.split('\n');
    const lines2 = result.v2.content.split('\n');

    let html = '';
    const maxLen = Math.max(lines1.length, lines2.length);
    let i = 0, j = 0;

    while (i < lines1.length || j < lines2.length) {
      if (i < lines1.length && j < lines2.length) {
        if (lines1[i] === lines2[j]) {
          html += `<span class="diff-context">  ${esc(lines1[i])}</span>`;
          i++; j++;
        } else {
          html += `<span class="diff-removed">- ${esc(lines1[i])}</span>`;
          html += `<span class="diff-added">+ ${esc(lines2[j])}</span>`;
          i++; j++;
        }
      } else if (i < lines1.length) {
        html += `<span class="diff-removed">- ${esc(lines1[i])}</span>`;
        i++;
      } else {
        html += `<span class="diff-added">+ ${esc(lines2[j])}</span>`;
        j++;
      }
    }

    output.innerHTML = html || '<span class="diff-context">No differences found</span>';
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ===== Search =====
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const q = e.target.value.trim();
    if (!q) {
      renderPrompts(allPrompts);
      return;
    }
    try {
      const results = await api(`/api/search?q=${encodeURIComponent(q)}`);
      renderPrompts(results);
    } catch (e) {
      toast(e.message, 'error');
    }
  }, 300);
});

// ===== Import/Export =====
function openImportModal() {
  openModal('importModal');
}

function exportPrompts() {
  const dataStr = JSON.stringify(allPrompts, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `promptstack-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  toast(`Exported ${allPrompts.length} prompts`, 'success');
}

async function importPrompts(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const imported = JSON.parse(text);
    
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected an array of prompts');
    }
    
    let importedCount = 0;
    for (const prompt of imported) {
      try {
        await api('/api/prompts', {
          method: 'POST',
          body: JSON.stringify({
            name: prompt.name,
            description: prompt.description,
            category: prompt.category || 'general',
            content: prompt.versions?.[0]?.content || prompt.content || '',
            tags: prompt.tags || [],
          }),
        });
        importedCount++;
      } catch (e) {
        console.warn('Failed to import prompt:', prompt.name, e);
      }
    }
    
    closeModal('importModal');
    toast(`Imported ${importedCount} prompts`, 'success');
    loadPrompts();
  } catch (e) {
    toast('Import failed: ' + e.message, 'error');
  }
  
  // Reset file input
  event.target.value = '';
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
  // Setup character counters
  const createTextarea = document.querySelector('#createForm textarea[name="content"]');
  const versionTextarea = document.querySelector('#versionForm textarea[name="content"]');
  
  if (createTextarea) {
    createTextarea.id = 'createContentTextarea';
    createTextarea.addEventListener('input', () => {
      document.getElementById('createCharCount').textContent = 
        `${createTextarea.value.length.toLocaleString()} characters`;
    });
  }
  
  if (versionTextarea) {
    versionTextarea.id = 'versionContentTextarea';
    versionTextarea.addEventListener('input', () => {
      document.getElementById('versionCharCount').textContent = 
        `${versionTextarea.value.length.toLocaleString()} characters`;
    });
  }
  
  loadPrompts();
});
