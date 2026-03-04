'use client';

import { useEffect, useState } from 'react';

interface ProjectSummary {
  name: string; hasReadme: boolean; readmePreview: string[];
  fileCount: number; lastModified: string; launchable: boolean;
}

interface ProjectDetail {
  name: string; path: string; readme: string; fileCount: number;
  files: { name: string; isDir: boolean }[];
  lastModified: string; packageJson: { name: string; scripts: string[]; dependencies: number } | null;
  hasEnv: boolean; deployUrl: string | null; launchable: boolean;
}

const btnStyle = (color: string): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit',
  background: `${color}18`, border: `1px solid ${color}40`, color, display: 'inline-flex', alignItems: 'center', gap: 6,
});

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedName, setExpandedName] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const loadDetail = async (name: string) => {
    if (expandedName === name) { setExpandedName(null); setDetail(null); return; }
    setExpandedName(name);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/projects?name=${encodeURIComponent(name)}`);
      if (res.ok) setDetail(await res.json());
    } catch {} finally { setDetailLoading(false); }
  };

  const formatName = (name: string) => name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const timeAgo = (iso: string) => {
    const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (h < 1) return 'just now'; if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  };

  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent);
  const filtered = projects.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Projects</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{projects.length} projects in workspace</p>
        </div>
        <input
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
          style={{
            padding: '8px 14px', borderRadius: 8, fontSize: 13, width: 220,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
          }}
        />
      </div>

      {loading ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>Scanning workspace...</div>
      ) : filtered.length === 0 ? (
        <div className="glass" style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          {search ? 'No matching projects' : 'No projects found'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => {
            const isExpanded = expandedName === p.name;
            return (
              <div key={p.name} className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
                {/* Summary row */}
                <div
                  onClick={() => loadDetail(p.name)}
                  className="glass-hover"
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{p.launchable ? '🚀' : '📁'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{formatName(p.name)}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>{p.name}</span>
                    </div>
                    {p.hasReadme && p.readmePreview.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.readmePreview[0]?.replace(/^#+ /, '')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--muted)' }}>
                      {p.fileCount} files
                    </span>
                    {p.hasReadme && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', color: 'var(--gold)' }}>README</span>
                    )}
                    {p.launchable && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 6, background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.25)', color: '#34d399' }}>Launchable</span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(p.lastModified)}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>&#9654;</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '16px 20px' }}>
                    {detailLoading ? (
                      <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading...</div>
                    ) : detail ? (
                      <div>
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                          {detail.launchable && (
                            <button onClick={e => { e.stopPropagation(); window.open(`http://localhost:3000`, '_blank'); }} style={btnStyle('#34d399')}>
                              &#9654; Launch Locally
                            </button>
                          )}
                          {detail.deployUrl && (
                            <button onClick={e => { e.stopPropagation(); window.open(detail.deployUrl!, '_blank'); }} style={btnStyle('var(--cyan)')}>
                              🌐 Open Live
                            </button>
                          )}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              // Copy the path, user can paste in terminal
                              navigator.clipboard.writeText(isMac ? `open "${detail.path}"` : `explorer "${detail.path}"`);
                              alert(`Copied to clipboard:\n${isMac ? 'open' : 'explorer'} "${detail.path}"\n\nPaste in terminal to open the folder.`);
                            }}
                            style={btnStyle('var(--gold)')}
                          >
                            📂 {isMac ? 'Show in Finder' : 'Open Folder'}
                          </button>
                          {detail.packageJson && (
                            <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>
                              Scripts: {detail.packageJson.scripts.join(', ')} | {detail.packageJson.dependencies} deps
                            </span>
                          )}
                        </div>

                        {/* File tree */}
                        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Files</div>
                            <div style={{ maxHeight: 300, overflowY: 'auto', fontSize: 12 }}>
                              {detail.files.map((f, i) => (
                                <div key={i} style={{
                                  padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 8,
                                  color: f.isDir ? 'var(--cyan)' : 'var(--muted)',
                                }}>
                                  <span style={{ fontSize: 11 }}>{f.isDir ? '📁' : '📄'}</span>
                                  <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{f.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* README */}
                          {detail.readme && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gold)', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>README</div>
                              <div style={{
                                maxHeight: 400, overflowY: 'auto', fontSize: 12, lineHeight: 1.7, color: 'var(--muted)',
                                padding: 16, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                whiteSpace: 'pre-wrap', fontFamily: 'inherit',
                              }}>
                                {detail.readme}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        <div style={{ display: 'flex', gap: 16, fontSize: 11, color: 'var(--muted)', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <span>Path: <code style={{ color: 'var(--text)', fontSize: 10 }}>{detail.path}</code></span>
                          <span>Modified: {new Date(detail.lastModified).toLocaleDateString()}</span>
                          {detail.hasEnv && <span style={{ color: '#fbbf24' }}>.env present</span>}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
