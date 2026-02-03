/**
 * Storage scan & cleanup logic (used by Electron main process).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const HOME = os.homedir();

function dirSize(dirPath) {
  try {
    const out = execSync(`du -sk "${dirPath}" 2>/dev/null`, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    const kb = parseInt(out.split(/\s/)[0], 10);
    return isNaN(kb) ? 0 : kb;
  } catch {
    return 0;
  }
}

function formatBytes(kb) {
  if (kb >= 1024 * 1024) return (kb / 1024 / 1024).toFixed(1) + ' GB';
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
}

function safePath(userPath) {
  const resolved = path.isAbsolute(userPath) ? path.resolve(userPath) : path.resolve(HOME, userPath.replace(/^~\/?/, ''));
  return resolved.startsWith(HOME) ? resolved : null;
}

function scanCaches() {
  const base = path.join(HOME, 'Library', 'Caches');
  const items = [];
  try {
    const dirs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const d of dirs) {
      const full = path.join(base, d.name);
      const kb = dirSize(full);
      if (kb > 0) items.push({ name: d.name, path: full, sizeKb: kb, sizeFormatted: formatBytes(kb) });
    }
    items.sort((a, b) => b.sizeKb - a.sizeKb);
  } catch (e) {
    return { error: String(e.message), items: [], totalKb: 0, totalFormatted: '0 B' };
  }
  const totalKb = items.reduce((s, i) => s + i.sizeKb, 0);
  return { totalKb, totalFormatted: formatBytes(totalKb), items };
}

function scanDocker() {
  const base = path.join(HOME, 'Library', 'Containers', 'com.docker.docker');
  const breakdown = [];
  let totalKb = 0;
  try {
    const dataDir = path.join(base, 'Data');
    if (fs.existsSync(dataDir)) {
      for (const sub of ['vms', 'log', 'cagent', 'tasks']) {
        const p = path.join(dataDir, sub);
        if (fs.existsSync(p)) {
          const kb = dirSize(p);
          totalKb += kb;
          if (kb > 0) breakdown.push({ name: sub, path: p, sizeKb: kb, sizeFormatted: formatBytes(kb) });
        }
      }
    }
    if (totalKb === 0) totalKb = dirSize(base);
  } catch (e) {
    return { error: String(e.message), totalKb: 0, totalFormatted: '0 B', breakdown: [] };
  }
  return { totalKb, totalFormatted: formatBytes(totalKb), breakdown };
}

const DOT_CACHES = [
  { key: 'npm', dir: '.npm', label: 'npm cache' },
  { key: 'yarn', dir: '.yarn', label: 'Yarn cache' },
  { key: 'gradle', dir: '.gradle', label: 'Gradle' },
  { key: 'android', dir: '.android', label: 'Android (home)' },
  { key: 'nuget', dir: '.nuget', label: 'NuGet' },
  { key: 'nvm', dir: '.nvm', label: 'Node versions (nvm)' },
  { key: 'cargo', dir: '.cargo', label: 'Rust/Cargo' },
  { key: 'pub', dir: '.pub-cache', label: 'Flutter pub' },
];

function scanDotCaches() {
  const items = [];
  for (const { key, dir, label } of DOT_CACHES) {
    const full = path.join(HOME, dir);
    if (!fs.existsSync(full)) continue;
    const kb = dirSize(full);
    if (kb > 0) items.push({ key, name: dir, label, path: full, sizeKb: kb, sizeFormatted: formatBytes(kb) });
  }
  items.sort((a, b) => b.sizeKb - a.sizeKb);
  const totalKb = items.reduce((s, i) => s + i.sizeKb, 0);
  return { totalKb, totalFormatted: formatBytes(totalKb), items };
}

const LIBRARY_SPOTS = [
  { key: 'developer', dir: 'Library/Developer', label: 'Xcode & Simulators' },
  { key: 'applicationSupport', dir: 'Library/Application Support', label: 'Application Support' },
  { key: 'containers', dir: 'Library/Containers', label: 'Containers (Docker, apps)' },
  { key: 'android', dir: 'Library/Android', label: 'Android SDK' },
  { key: 'parallels', dir: 'Library/Parallels', label: 'Parallels VMs' },
];

function scanLibrary() {
  const items = [];
  for (const { key, dir, label } of LIBRARY_SPOTS) {
    const full = path.join(HOME, dir);
    if (!fs.existsSync(full)) continue;
    const kb = dirSize(full);
    if (kb > 0) items.push({ key, name: dir, label, path: full, sizeKb: kb, sizeFormatted: formatBytes(kb) });
  }
  items.sort((a, b) => b.sizeKb - a.sizeKb);
  const totalKb = items.reduce((s, i) => s + i.sizeKb, 0);
  return { totalKb, totalFormatted: formatBytes(totalKb), items };
}

function scanCursor() {
  const base = path.join(HOME, 'Library', 'Application Support', 'Cursor');
  if (!fs.existsSync(base)) return { totalKb: 0, totalFormatted: '0 B', items: [] };
  const globalStorage = path.join(base, 'User', 'globalStorage');
  const items = [];
  let totalKb = 0;
  if (fs.existsSync(globalStorage)) {
    try {
      const files = fs.readdirSync(globalStorage, { withFileTypes: true });
      for (const f of files) {
        const full = path.join(globalStorage, f.name);
        const kb = f.isDirectory() ? dirSize(full) : Math.ceil((fs.statSync(full).size || 0) / 1024);
        if (kb > 0) {
          items.push({ name: f.name, path: full, sizeKb: kb, sizeFormatted: formatBytes(kb) });
          totalKb += kb;
        }
      }
      items.sort((a, b) => b.sizeKb - a.sizeKb);
    } catch (e) {
      totalKb = dirSize(base);
      items.push({ name: 'Cursor (total)', path: base, sizeKb: totalKb, sizeFormatted: formatBytes(totalKb) });
    }
  }
  if (totalKb === 0) totalKb = dirSize(base);
  return { totalKb, totalFormatted: formatBytes(totalKb), items };
}

function runFullScan() {
  const caches = scanCaches();
  const docker = scanDocker();
  const dotCaches = scanDotCaches();
  const library = scanLibrary();
  const cursor = scanCursor();
  const totalKb =
    (caches.totalKb || 0) + (docker.totalKb || 0) + (dotCaches.totalKb || 0) + (library.totalKb || 0) + (cursor.totalKb || 0);
  return {
    caches,
    docker,
    dotCaches,
    library,
    cursor,
    summary: { totalKb, totalFormatted: formatBytes(totalKb) },
  };
}

function deletePath(p) {
  const resolved = safePath(p);
  if (!resolved || !resolved.startsWith(HOME)) throw new Error('Invalid path');
  if (!fs.existsSync(resolved)) return { deleted: 0, message: 'Path did not exist' };
  const stat = fs.statSync(resolved);
  const wasDir = stat.isDirectory();
  if (wasDir) fs.rmSync(resolved, { recursive: true, force: true });
  else fs.unlinkSync(resolved);
  return { deleted: 1, message: wasDir ? 'Directory removed' : 'File removed' };
}

function runNpmCacheClean() {
  try {
    execSync('npm cache clean --force', { encoding: 'utf8', timeout: 60000 });
    return { ok: true, message: 'npm cache cleaned' };
  } catch (e) {
    return { ok: false, message: e.stderr || e.message || 'npm command failed' };
  }
}

function runDockerPrune() {
  try {
    execSync('docker system prune -a -f --volumes', { encoding: 'utf8', timeout: 300000 });
    return { ok: true, message: 'Docker prune completed' };
  } catch (e) {
    return { ok: false, message: e.stderr || e.message || 'Docker not running or failed' };
  }
}

function runSimulatorDeleteUnavailable() {
  try {
    execSync('xcrun simctl delete unavailable', { encoding: 'utf8', timeout: 120000 });
    return { ok: true, message: 'Unavailable simulators removed' };
  } catch (e) {
    return { ok: false, message: e.stderr || e.message || 'xcrun failed' };
  }
}

function runCursorBackupDelete() {
  const backupPath = path.join(HOME, 'Library/Application Support/Cursor/User/globalStorage/state.vscdb.backup');
  try {
    const result = deletePath(backupPath);
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

function cleanCaches(paths) {
  if (!Array.isArray(paths) || paths.length === 0) return { ok: false, message: 'paths array required' };
  const results = paths.map((p) => {
    try {
      return deletePath(p);
    } catch (e) {
      return { deleted: 0, error: e.message };
    }
  });
  return { ok: true, results };
}

module.exports = {
  runFullScan,
  cleanCaches,
  runNpmCacheClean,
  runDockerPrune,
  runSimulatorDeleteUnavailable,
  runCursorBackupDelete,
};
