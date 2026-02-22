let allPrompts = [];
let currentDetailPrompt = null;
let currentVersionIndex = 0;

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

function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

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
        <div class="empty-icon">&#x2728;</div>
        <h2>No prompts yet</h2>
        <p>Create your first prompt to get started with version control.</p>
        <button class="btn btn-primary" onclick="openCreateModal()">Create Your First Prompt</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = prompts.map(p => {
    const latest = p.versions[p.versions.length - 1];
    const rating = latest?.performance?.rating;
    return `
      <div class="prompt-card" onclick="openDetail('${p.id}')">
        <div class="card-header">
          <span class="card-name">${esc(p.name)}</span>
          <span class="card-category cat-${p.category}">${esc(p.category)}</span>
        </div>
        <div class="card-description">${esc(p.description || 'No description')}</div>
        <div class="card-meta">
          <span class="card-versions">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M6 20V4M18 20v-6"/></svg>
            ${p.versions.length} version${p.versions.length !== 1 ? 's' : ''}
          </span>
          ${rating ? `<span class="card-rating">${'&#11088;'.repeat(rating)}</span>` : ''}
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

function openCreateModal() {
  document.getElementById('createForm').reset();
  openModal('createModal');
}

function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

async function handleCreate(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api('/api/prompts', {
      method: 'POST',
      body: JSON.stringify({
        name: fd.get('name'),
        description: fd.get('description'),
        category: fd.get('category'),
        content: fd.get('content'),
      }),
    });
    closeModal('createModal');
    toast('Prompt created!');
    loadPrompts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

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
            ${ver.performance?.rating ? ' &#11088;' + ver.performance.rating : ''}
          </button>
        `).join('')}
      </div>

      <div class="version-content">${esc(v.content || '(empty)')}</div>

      <div class="version-meta">
        <span>Created: ${new Date(v.createdAt).toLocaleString()}</span>
        ${v.metadata?.notes ? `<span>Notes: ${esc(v.metadata.notes)}</span>` : ''}
        ${v.metadata?.model ? `<span>Model: ${esc(v.metadata.model)}</span>` : ''}
      </div>

      <div style="margin-top: 16px;">
        <span style="font-size: 0.85rem; color: var(--text-muted); margin-right: 8px;">Rate this version:</span>
        <span class="rating-stars">
          ${[1,2,3,4,5].map(r => `
            <span class="star" onclick="rateVersion('${p.id}', ${v.version}, ${r})"
              style="color: ${r <= (v.performance?.rating || 0) ? 'var(--warning)' : 'var(--text-dim)'}">&#9733;</span>
          `).join('')}
        </span>
      </div>
    </div>
  `;
}

function switchVersion(index) {
  currentVersionIndex = index;
  renderDetail();
}

function openVersionModal(promptId) {
  document.getElementById('versionPromptId').value = promptId;
  document.getElementById('versionForm').reset();
  document.getElementById('versionPromptId').value = promptId;
  openModal('versionModal');
}

async function handleAddVersion(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const promptId = fd.get('promptId');
  try {
    await api(`/api/prompts/${promptId}/versions`, {
      method: 'POST',
      body: JSON.stringify({
        content: fd.get('content'),
        notes: fd.get('notes'),
        model: fd.get('model'),
      }),
    });
    closeModal('versionModal');
    toast('Version added!');
    loadPrompts();
    const prompt = await api(`/api/prompts/${promptId}`);
    currentDetailPrompt = prompt;
    currentVersionIndex = prompt.versions.length - 1;
    renderDetail();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function rateVersion(promptId, version, rating) {
  try {
    await api(`/api/prompts/${promptId}/versions/${version}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    });
    toast(`Rated v${version}: ${'★'.repeat(rating)}`);
    const prompt = await api(`/api/prompts/${promptId}`);
    currentDetailPrompt = prompt;
    renderDetail();
    loadPrompts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

async function deletePrompt(id) {
  if (!confirm('Are you sure you want to delete this prompt?')) return;
  try {
    await api(`/api/prompts/${id}`, { method: 'DELETE' });
    closeModal('detailModal');
    toast('Prompt deleted');
    loadPrompts();
  } catch (e) {
    toast(e.message, 'error');
  }
}

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
      <div class="diff-output" id="diffOutput">Select versions and click Compare</div>
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

loadPrompts();
