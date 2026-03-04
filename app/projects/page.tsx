'use client';

import { useEffect, useState } from 'react';

interface Project {
  name: string;
  hasReadme: boolean;
  readmePreview: string[];
  fileCount: number;
  lastModified: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects || []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const formatProjectName = (name: string) => {
    return name
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          📁 Projects
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
          {projects.length} projects in workspace
        </p>
      </div>

      {loading ? (
        <div
          className="glass"
          style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}
        >
          Scanning workspace...
        </div>
      ) : projects.length === 0 ? (
        <div
          className="glass"
          style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}
        >
          No projects found
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 12,
          }}
        >
          {projects.map((p) => (
            <div
              key={p.name}
              className="glass glass-hover"
              style={{
                borderRadius: 12,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                cursor: 'default',
                transition: 'background 0.15s',
              }}
            >
              {/* Top row: name + badges */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatProjectName(p.name)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: 'var(--muted)',
                      fontFamily: 'inherit',
                      marginTop: 2,
                      opacity: 0.7,
                    }}
                  >
                    {p.name}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'var(--muted)',
                      fontWeight: 500,
                    }}
                  >
                    {p.fileCount} files
                  </span>
                  {p.hasReadme && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(201, 168, 76, 0.12)',
                        border: '1px solid rgba(201, 168, 76, 0.25)',
                        color: 'var(--gold)',
                        fontWeight: 500,
                      }}
                    >
                      README
                    </span>
                  )}
                </div>
              </div>

              {/* README preview */}
              {p.hasReadme && p.readmePreview.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--muted)',
                    lineHeight: 1.5,
                    borderLeft: '2px solid rgba(201, 168, 76, 0.2)',
                    paddingLeft: 10,
                  }}
                >
                  {p.readmePreview.map((line, i) => (
                    <div
                      key={i}
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {line}
                    </div>
                  ))}
                </div>
              )}

              {/* Footer: date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 'auto',
                  paddingTop: 8,
                  borderTop: '1px solid var(--glass-border)',
                }}
              >
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {formatDate(p.lastModified)}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--gold)',
                    opacity: 0.7,
                  }}
                >
                  {timeAgo(p.lastModified)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
