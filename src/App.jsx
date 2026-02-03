import { useState, useCallback } from 'react';

const formatKb = (kb) => {
  if (kb >= 1024 * 1024) return (kb / 1024 / 1024).toFixed(1) + ' GB';
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
};

const hasStorageApi = typeof window !== 'undefined' && window.storageApi;

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);

  const scan = useCallback(async () => {
    if (!hasStorageApi) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await window.storageApi.scan();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = (title, body, onConfirm) => {
    setModal({ title, body, onConfirm });
  };

  const closeModal = () => setModal(null);

  const runConfirm = async () => {
    if (modal?.onConfirm) {
      await modal.onConfirm();
      closeModal();
    }
  };

  const cleanCaches = async (paths) => {
    const res = await window.storageApi.cleanCaches(paths);
    if (res.ok) alert('Done.');
    else alert('Error: ' + (res.message || 'Unknown'));
    scan();
  };

  const cleanNpm = async () => {
    const res = await window.storageApi.cleanNpm();
    if (res.ok) alert('npm cache cleaned.');
    else alert('Error: ' + (res.message || 'Unknown'));
    scan();
  };

  const cleanDocker = async () => {
    const res = await window.storageApi.cleanDocker();
    if (res.ok) alert('Docker prune completed.');
    else alert('Error: ' + (res.message || 'Docker may not be running.'));
    scan();
  };

  const cleanCursorBackup = async () => {
    const res = await window.storageApi.cleanCursorBackup();
    if (res.ok) alert('Cursor backup file removed.');
    else alert('Error: ' + (res.message || 'File may not exist.'));
    scan();
  };

  const cleanSimulators = async () => {
    const res = await window.storageApi.cleanSimulators();
    if (res.ok) alert('Unavailable simulators removed.');
    else alert('Error: ' + (res.message || 'xcrun failed.'));
    scan();
  };

  const hasBackup = result?.cursor?.items?.some((i) => i.name === 'state.vscdb.backup');

  return (
    <>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 0.25rem 0' }}>
          Storage Manager
        </h1>
        <p className="subtitle" style={{ color: 'var(--text-muted)', margin: '0 0 1.5rem 0', fontSize: '0.95rem' }}>
          Scan and free space on your Mac
        </p>
        {!hasStorageApi ? (
          <p style={{ color: 'var(--text-muted)' }}>
            Run with Electron: <code>npm run electron:start</code>
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={scan}
            disabled={loading}
          >
            {loading ? 'Scanning…' : 'Scan storage'}
          </button>
        )}
      </header>

      <main style={{ flex: 1 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div className="spinner" />
            <p>Scanning disk usage…</p>
          </div>
        )}

        {error && (
          <div className="section">
            <div className="section-body" style={{ padding: '1rem', color: 'var(--danger)' }}>
              Scan failed: {error}
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            <div className="summary-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Total scanned</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '1.25rem', color: 'var(--accent)' }}>
                {result.summary?.totalFormatted ?? '—'}
              </span>
            </div>

            {result.caches?.items?.length > 0 && (
              <section className="section">
                <div className="section-header">
                  <h2 className="section-title">~/Library/Caches</h2>
                  <span className="section-size">{result.caches.totalFormatted}</span>
                </div>
                <div className="section-body">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Folder</th>
                          <th>Size</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.caches.items.slice(0, 25).map((i) => (
                          <tr key={i.path}>
                            <td>{i.name}</td>
                            <td className="size">{i.sizeFormatted}</td>
                            <td className="actions-cell">
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  confirm(
                                    'Delete cache folder',
                                    `Delete this folder? It will be recreated by the app when needed.\n\n${i.path}`,
                                    () => cleanCaches([i.path])
                                  )
                                }
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {result.docker && (result.docker.breakdown?.length > 0 || result.docker.totalKb > 0) && (
              <section className="section">
                <div className="section-header">
                  <h2 className="section-title">Docker</h2>
                  <span className="section-size">{result.docker.totalFormatted}</span>
                </div>
                <div className="section-body">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Path</th>
                          <th>Size</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(result.docker.breakdown || []).map((i) => (
                          <tr key={i.path}>
                            <td>{i.name}</td>
                            <td className="size">{i.sizeFormatted}</td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ padding: '0 1.25rem 0.75rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Removes unused images, containers, volumes. Docker must be running.
                  </p>
                  <p style={{ padding: '0 1.25rem 0.75rem', margin: 0 }}>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => confirm('Docker prune', 'Remove all unused Docker images, containers, and volumes? Docker must be running.', cleanDocker)}>
                      Docker prune (clean unused)
                    </button>
                  </p>
                </div>
              </section>
            )}

            {result.dotCaches?.items?.length > 0 && (
              <section className="section">
                <div className="section-header">
                  <h2 className="section-title">Dev caches (~/.npm, ~/.yarn, …)</h2>
                  <span className="section-size">{result.dotCaches.totalFormatted}</span>
                </div>
                <div className="section-body">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Folder</th>
                          <th>Size</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.dotCaches.items.map((i) => (
                          <tr key={i.path}>
                            <td>{i.name} <span style={{ color: 'var(--text-muted)' }}>{i.label}</span></td>
                            <td className="size">{i.sizeFormatted}</td>
                            <td className="actions-cell">
                              {i.key === 'npm' ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger"
                                  onClick={() => confirm('Clean npm cache', 'Run "npm cache clean --force"? This often frees ~10 GB.', cleanNpm)}
                                >
                                  Clean npm cache
                                </button>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {result.library?.items?.length > 0 && (
              <section className="section">
                <div className="section-header">
                  <h2 className="section-title">~/Library (Xcode, Android, …)</h2>
                  <span className="section-size">{result.library.totalFormatted}</span>
                </div>
                <div className="section-body">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Location</th>
                          <th>Size</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.library.items.map((i) => (
                          <tr key={i.path}>
                            <td>{i.label || i.name}</td>
                            <td className="size">{i.sizeFormatted}</td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {result.cursor && (result.cursor.items?.length > 0 || result.cursor.totalKb > 0) && (
              <section className="section">
                <div className="section-header">
                  <h2 className="section-title">Cursor (Application Support)</h2>
                  <span className="section-size">{result.cursor.totalFormatted}</span>
                </div>
                <div className="section-body">
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>File / folder</th>
                          <th>Size</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.cursor.items.slice(0, 15).map((i) => (
                          <tr key={i.path}>
                            <td>{i.name}</td>
                            <td className="size">{i.sizeFormatted}</td>
                            <td></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {hasBackup && (
                    <>
                      <p style={{ padding: '0 1.25rem 0.75rem', margin: 0 }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() =>
                            confirm('Delete Cursor backup file', 'Delete state.vscdb.backup? Quit Cursor first. Your main state is kept.', cleanCursorBackup)
                          }
                        >
                          Delete state.vscdb.backup (free ~6 GB)
                        </button>
                      </p>
                      <p style={{ padding: '0 1.25rem', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Quit Cursor first.
                      </p>
                    </>
                  )}
                </div>
              </section>
            )}

            <section className="section">
              <div className="section-header">
                <h2 className="section-title">Xcode Simulators</h2>
              </div>
              <div className="section-body">
                <p style={{ padding: '0 1.25rem 0.75rem', margin: 0, fontSize: '0.9rem' }}>
                  Remove unavailable simulator runtimes to free ~10–20 GB.
                </p>
                <p style={{ padding: '0 1.25rem 0.75rem', margin: 0 }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() =>
                      confirm('Delete unavailable simulators', 'Run "xcrun simctl delete unavailable"? This removes old simulator runtimes.', cleanSimulators)
                    }
                  >
                    Delete unavailable simulators
                  </button>
                </p>
              </div>
            </section>
          </>
        )}

        {!result && !loading && hasStorageApi && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p>Click <strong>Scan storage</strong> to see what’s using space in caches, Docker, and dev tools.</p>
          </div>
        )}
      </main>

      {modal && (
        <>
          <div className="modal-backdrop" onClick={closeModal} aria-hidden="true" />
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
            <h2 id="modalTitle" className="modal-title">{modal.title}</h2>
            <p className="modal-body">{modal.body}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={runConfirm}>
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      <footer className="footer">
        <p>Only safe, reversible cleanups are offered. Quit Cursor before removing its backup file.</p>
      </footer>
    </>
  );
}
