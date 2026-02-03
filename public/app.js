const API = '/api';

const $ = (id) => document.getElementById(id);
const scanBtn = $('scanBtn');
const loading = $('loading');
const summary = $('summary');
const summaryTotal = $('summaryTotal');
const sections = $('sections');
const empty = $('empty');
const modal = $('modal');
const modalTitle = $('modalTitle');
const modalBody = $('modalBody');
const modalCancel = $('modalCancel');
const modalConfirm = $('modalConfirm');
const modalBackdrop = $('modalBackdrop');

let lastScan = null;
let pendingAction = null;

async function scan() {
  scanBtn.setAttribute('aria-busy', 'true');
  scanBtn.querySelector('.btn-text').textContent = 'Scanning…';
  scanBtn.disabled = true;
  empty.classList.add('hidden');
  summary.classList.add('hidden');
  sections.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const res = await fetch(`${API}/scan`);
    if (!res.ok) throw new Error(res.statusText);
    lastScan = await res.json();
    render(lastScan);
  } catch (e) {
    sections.innerHTML = `<div class="section"><div class="section-body" style="padding:1rem; color: var(--danger);">Scan failed: ${e.message}</div></div>`;
    sections.classList.remove('hidden');
  } finally {
    loading.classList.add('hidden');
    scanBtn.disabled = false;
    scanBtn.setAttribute('aria-busy', 'false');
    scanBtn.querySelector('.btn-text').textContent = 'Scan storage';
  }
}

function render(data) {
  summaryTotal.textContent = data.summary?.totalFormatted ?? '—';
  summary.classList.remove('hidden');

  const html = [];
  const { caches, docker, dotCaches, library, cursor } = data;

  // Caches
  if (caches && (caches.items?.length > 0 || caches.totalKb > 0)) {
    const total = caches.totalFormatted || formatKb(caches.totalKb);
    let rows = (caches.items || []).slice(0, 25).map((i) => `
      <tr>
        <td>${escapeHtml(i.name)}</td>
        <td class="size">${i.sizeFormatted || formatKb(i.sizeKb)}</td>
        <td class="actions-cell">
          <button type="button" class="btn btn-sm btn-danger" data-clean-cache="${escapeAttr(i.path)}">Delete</button>
        </td>
      </tr>
    `).join('');
    html.push(`
      <section class="section" data-section="caches">
        <div class="section-header">
          <h2 class="section-title">~/Library/Caches</h2>
          <span class="section-size">${total}</span>
        </div>
        <div class="section-body">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Folder</th><th>Size</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </section>
    `);
  }

  // Docker
  if (docker && (docker.breakdown?.length > 0 || docker.totalKb > 0)) {
    const total = docker.totalFormatted || formatKb(docker.totalKb);
    const rows = (docker.breakdown || []).map((i) => `
      <tr><td>${escapeHtml(i.name)}</td><td class="size">${i.sizeFormatted || formatKb(i.sizeKb)}</td><td></td></tr>
    `).join('');
    html.push(`
      <section class="section" data-section="docker">
        <div class="section-header">
          <h2 class="section-title">Docker</h2>
          <span class="section-size">${total}</span>
        </div>
        <div class="section-body">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Path</th><th>Size</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p style="padding: 0 1.25rem 0.75rem; margin: 0; font-size: 0.85rem; color: var(--text-muted);">Removes unused images, containers, volumes. Docker must be running.</p>
          <p style="padding: 0 1.25rem 0.75rem; margin: 0;"><button type="button" class="btn btn-sm btn-danger" data-clean-docker>Docker prune (clean unused)</button></p>
        </div>
      </section>
    `);
  }

  // Dot caches (npm, yarn, etc.)
  if (dotCaches && dotCaches.items?.length > 0) {
    const total = dotCaches.totalFormatted || formatKb(dotCaches.totalKb);
    let rows = dotCaches.items.map((i) => {
      const canClean = i.key === 'npm';
      return `
        <tr>
          <td>${escapeHtml(i.name)} <span style="color:var(--text-muted)">${escapeHtml(i.label || '')}</span></td>
          <td class="size">${i.sizeFormatted || formatKb(i.sizeKb)}</td>
          <td class="actions-cell">${canClean ? `<button type="button" class="btn btn-sm btn-danger" data-clean-npm>Clean npm cache</button>` : '—'}</td>
        </tr>
      `;
    }).join('');
    html.push(`
      <section class="section" data-section="dotCaches">
        <div class="section-header">
          <h2 class="section-title">Dev caches (~/.npm, ~/.yarn, …)</h2>
          <span class="section-size">${total}</span>
        </div>
        <div class="section-body">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Folder</th><th>Size</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </section>
    `);
  }

  // Library (Xcode, Application Support, etc.)
  if (library && library.items?.length > 0) {
    const total = library.totalFormatted || formatKb(library.totalKb);
    const rows = library.items.map((i) => `
      <tr><td>${escapeHtml(i.label || i.name)}</td><td class="size">${i.sizeFormatted || formatKb(i.sizeKb)}</td><td></td></tr>
    `).join('');
    html.push(`
      <section class="section" data-section="library">
        <div class="section-header">
          <h2 class="section-title">~/Library (Xcode, Android, …)</h2>
          <span class="section-size">${total}</span>
        </div>
        <div class="section-body">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Location</th><th>Size</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </div>
      </section>
    `);
  }

  // Cursor
  if (cursor && (cursor.items?.length > 0 || cursor.totalKb > 0)) {
    const total = cursor.totalFormatted || formatKb(cursor.totalKb);
    const hasBackup = (cursor.items || []).some((i) => i.name === 'state.vscdb.backup');
    const rows = (cursor.items || []).slice(0, 15).map((i) => `
      <tr><td>${escapeHtml(i.name)}</td><td class="size">${i.sizeFormatted || formatKb(i.sizeKb)}</td><td></td></tr>
    `).join('');
    html.push(`
      <section class="section" data-section="cursor">
        <div class="section-header">
          <h2 class="section-title">Cursor (Application Support)</h2>
          <span class="section-size">${total}</span>
        </div>
        <div class="section-body">
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>File / folder</th><th>Size</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${hasBackup ? '<p style="padding: 0 1.25rem 0.75rem; margin: 0;"><button type="button" class="btn btn-sm btn-danger" data-clean-cursor-backup>Delete state.vscdb.backup (free ~6 GB)</button></p><p style="padding: 0 1.25rem; margin: 0; font-size: 0.85rem; color: var(--text-muted);">Quit Cursor first.</p>' : ''}
        </div>
      </section>
    `);
  }

  // Simulators (always show button if we have scan)
  html.push(`
    <section class="section" data-section="simulators">
      <div class="section-header">
        <h2 class="section-title">Xcode Simulators</h2>
      </div>
      <div class="section-body">
        <p style="padding: 0 1.25rem 0.75rem; margin: 0; font-size: 0.9rem;">Remove unavailable simulator runtimes to free ~10–20 GB.</p>
        <p style="padding: 0 1.25rem 0.75rem; margin: 0;"><button type="button" class="btn btn-sm btn-danger" data-clean-simulators>Delete unavailable simulators</button></p>
      </div>
    </section>
  `);

  sections.innerHTML = html.join('');
  sections.classList.remove('hidden');
  bindCleanButtons();
}

function formatKb(kb) {
  if (kb >= 1024 * 1024) return (kb / 1024 / 1024).toFixed(1) + ' GB';
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/"/g, '&quot;');
}

function bindCleanButtons() {
  sections.querySelectorAll('[data-clean-cache]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const path = btn.getAttribute('data-clean-cache');
      confirmAction(
        'Delete cache folder',
        `Delete this folder? It will be recreated by the app when needed.\n\n${path}`,
        () => cleanCaches([path])
      );
    });
  });

  sections.querySelectorAll('[data-clean-docker]').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmAction(
        'Docker prune',
        'Remove all unused Docker images, containers, and volumes? Docker must be running.',
        () => cleanDocker()
      );
    });
  });

  sections.querySelectorAll('[data-clean-npm]').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmAction(
        'Clean npm cache',
        'Run "npm cache clean --force"? This often frees ~10 GB.',
        () => cleanNpm()
      );
    });
  });

  sections.querySelectorAll('[data-clean-cursor-backup]').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmAction(
        'Delete Cursor backup file',
        'Delete state.vscdb.backup? Quit Cursor first. Your main state is kept.',
        () => cleanCursorBackup()
      );
    });
  });

  sections.querySelectorAll('[data-clean-simulators]').forEach((btn) => {
    btn.addEventListener('click', () => {
      confirmAction(
        'Delete unavailable simulators',
        'Run "xcrun simctl delete unavailable"? This removes old simulator runtimes.',
        () => cleanSimulators()
      );
    });
  });
}

function confirmAction(title, body, onConfirm) {
  pendingAction = onConfirm;
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modal.classList.remove('hidden');
  modalConfirm.focus();
}

function closeModal() {
  modal.classList.add('hidden');
  pendingAction = null;
}

modalCancel.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
modalConfirm.addEventListener('click', () => {
  if (pendingAction) {
    pendingAction();
    closeModal();
  }
});

async function cleanCaches(paths) {
  try {
    const res = await fetch(`${API}/clean/caches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths }),
    });
    const data = await res.json();
    if (data.ok) alert('Done. ' + (data.results?.length ? data.results.map((r) => r.message || r.error).join(' ') : ''));
    else alert('Error: ' + (data.message || 'Unknown'));
    scan();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function cleanDocker() {
  try {
    const res = await fetch(`${API}/clean/docker`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) alert('Docker prune completed.');
    else alert('Error: ' + (data.message || 'Docker may not be running.'));
    scan();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function cleanNpm() {
  try {
    const res = await fetch(`${API}/clean/npm`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) alert('npm cache cleaned.');
    else alert('Error: ' + (data.message || 'Unknown'));
    scan();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function cleanCursorBackup() {
  try {
    const res = await fetch(`${API}/clean/cursor-backup`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) alert('Cursor backup file removed.');
    else alert('Error: ' + (data.message || 'File may not exist.'));
    scan();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function cleanSimulators() {
  try {
    const res = await fetch(`${API}/clean/simulators`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) alert('Unavailable simulators removed.');
    else alert('Error: ' + (data.message || 'xcrun failed.'));
    scan();
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

scanBtn.addEventListener('click', scan);
