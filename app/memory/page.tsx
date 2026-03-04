'use client';

import { useEffect, useState } from 'react';

interface MemoryFile {
  filename: string;
  date: string;
  sizeKB: number;
  firstLines: string[];
}

export default function MemoryPage() {
  const [longTerm, setLongTerm] = useState<MemoryFile | null>(null);
  const [daily, setDaily] = useState<MemoryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    fetch('/api/memory')
      .then((r) => r.json())
      .then((d) => {
        setLongTerm(d.longTerm || null);
        setDaily(d.daily || []);
      })
      .catch(() => {
        setLongTerm(null);
        setDaily([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (filename: string) => {
    if (expanded === filename) {
      setExpanded(null);
      setExpandedContent('');
      return;
    }
    setExpanded(filename);
    setLoadingContent(true);
    try {
      const r = await fetch(`/api/memory?file=${encodeURIComponent(filename)}`);
      const d = await r.json();
      setExpandedContent(d.content || 'Empty file');
    } catch {
      setExpandedContent('Failed to load content');
    } finally {
      setLoadingContent(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          🧠 Memory
        </h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 13 }}>
          {daily.length} daily entries{longTerm ? ' + long-term memory' : ''}
        </p>
      </div>

      {loading ? (
        <div
          className="glass"
          style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}
        >
          Loading memory files...
        </div>
      ) : (
        <>
          {/* Long-term Memory card */}
          {longTerm && (
            <div
              className="glass"
              style={{
                borderRadius: 12,
                padding: 20,
                borderLeft: '3px solid var(--gold)',
                cursor: 'pointer',
              }}
              onClick={() => handleExpand(longTerm.filename)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>🏛️</span>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--gold)', fontSize: 14 }}>
                      Long-term Memory
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                      MEMORY.md &middot; {longTerm.sizeKB} KB &middot; Updated {formatDate(longTerm.date)}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    color: 'var(--muted)',
                    fontSize: 16,
                    transition: 'transform 0.2s',
                    transform: expanded === longTerm.filename ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  ▾
                </span>
              </div>
              {/* Preview lines */}
              {expanded !== longTerm.filename && (
                <div style={{ marginTop: 12, paddingLeft: 32 }}>
                  {longTerm.firstLines.map((line, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
              {/* Expanded content */}
              {expanded === longTerm.filename && (
                <div
                  style={{
                    marginTop: 12,
                    paddingLeft: 32,
                    maxHeight: 400,
                    overflowY: 'auto',
                  }}
                >
                  {loadingContent ? (
                    <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
                  ) : (
                    <pre
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 12,
                        color: 'var(--text)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        margin: 0,
                      }}
                    >
                      {expandedContent}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Daily memory files */}
          {daily.length === 0 ? (
            <div
              className="glass"
              style={{ borderRadius: 12, padding: 48, textAlign: 'center', color: 'var(--muted)' }}
            >
              No memory files found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {daily.map((file) => {
                const isExpanded = expanded === file.filename;
                return (
                  <div
                    key={file.filename}
                    className="glass glass-hover"
                    style={{
                      borderRadius: 10,
                      padding: '14px 20px',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onClick={() => handleExpand(file.filename)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, opacity: 0.5 }}>📝</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontWeight: 500,
                                color: 'var(--text)',
                                fontSize: 13,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.filename.replace('.md', '')}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: 'var(--muted)',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '2px 6px',
                                borderRadius: 4,
                                flexShrink: 0,
                              }}
                            >
                              {file.sizeKB} KB
                            </span>
                          </div>
                          {!isExpanded && (
                            <div
                              style={{
                                fontSize: 11,
                                color: 'var(--muted)',
                                marginTop: 2,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.firstLines[0] || 'Empty'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {formatDate(file.date)} {formatTime(file.date)}
                        </span>
                        <span
                          style={{
                            color: 'var(--muted)',
                            fontSize: 14,
                            transition: 'transform 0.2s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        >
                          ▾
                        </span>
                      </div>
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px solid var(--glass-border)',
                          maxHeight: 400,
                          overflowY: 'auto',
                        }}
                      >
                        {loadingContent ? (
                          <div style={{ color: 'var(--muted)', fontSize: 12 }}>Loading...</div>
                        ) : (
                          <pre
                            style={{
                              fontFamily: 'inherit',
                              fontSize: 12,
                              color: 'var(--text)',
                              lineHeight: 1.6,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              margin: 0,
                            }}
                          >
                            {expandedContent}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
